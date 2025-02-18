import { NextRequest, NextResponse } from "next/server";
import { asc, eq, ilike, or, count as sqlCount } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import {
  Resource,
  ResourceSchedule,
  resourceSchedulesTable,
  resourcesTable,
} from "~/db/schemas/resources";
import UploadService from "~/services/upload";
import { resourceSchema } from "~/utils/yup-schemas/resource";

type Schema = {
  name: string;
  type: Resource["type"];
  location_id: string;
  thumbnail: File;
  schedule_type: Resource["schedule_type"];
  publish: boolean;
  description: string;
  schedules: ResourceSchedule[];
};

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { publish, thumbnail, schedules, ...validatedData } = await validateSchema<Schema>({
    object: resourceSchema,
    isFormData: true,
    data: body,
  });

  const [newResource] = await db
    .insert(resourcesTable)
    .values({
      ...(validatedData as any),
      status: publish ? "published" : "draft",
      thumbnail: "/pending-upload/" + Date.now() + "-" + thumbnail.name,
    })
    .returning();

  if (!newResource)
    return appError({
      status: 422,
      error: "Error processing request",
    });

  const thumbnailData = await UploadService.uploadSingle(thumbnail, "resources/thumbnails");

  const [[updatedResource]] = await Promise.all([
    db
      .update(resourcesTable)
      .set({ thumbnail: thumbnailData.url })
      .where(eq(resourcesTable.id, newResource.id))
      .returning(),

    validatedData.schedule_type !== "24/7" && schedules
      ? db.insert(resourceSchedulesTable).values(
          schedules.map((schedule) => ({
            ...schedule,
            resourceId: newResource.id,
          }))
        )
      : Promise.resolve(),
  ]);

  return NextResponse.json(updatedResource);
});

export const GET = catchAsync(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;

  const {
    limit,
    offset,
    q = "",
  } = await validateSchema<{
    q: string;
    limit: number;
    offset: number;
  }>({
    object: {
      limit: Yup.number()
        .optional()
        .transform((value) => (isNaN(value) ? undefined : value))
        .integer("Limit must be an integer"),
      offset: Yup.number()
        .optional()
        .transform((value) => (isNaN(value) ? undefined : value))
        .integer("Offset must be an integer"),
      q: Yup.string().optional(),
    },
    data: {
      limit: searchParams.get("limit") !== null ? parseInt(searchParams.get("limit")!) : undefined,
      offset:
        searchParams.get("offset") !== null ? parseInt(searchParams.get("offset")!) : undefined,
      q: searchParams.get("q") || undefined,
    },
  });

  const baseQuery = db
    .select()
    .from(resourcesTable)
    .where(or(ilike(resourcesTable.name, `%${q}%`), ilike(resourcesTable.description, `%${q}%`)));

  if (limit === undefined || offset === undefined) {
    const locations = await baseQuery.orderBy(asc(resourcesTable.created_at));
    return NextResponse.json(locations);
  }

  const [data, [count]] = await Promise.all([
    baseQuery.limit(limit).offset(offset),
    db
      .select({ count: sqlCount() })
      .from(resourcesTable)
      .where(ilike(resourcesTable.name, `%${q}%`)),
  ]);

  return NextResponse.json({
    data,
    ...count,
  });
});
