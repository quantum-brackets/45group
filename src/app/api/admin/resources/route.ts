import { NextRequest, NextResponse } from "next/server";
import { asc, eq, ilike, or, count as sqlCount } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import {
  resourceFacilitiesTable,
  resourceGroupsTable,
  resourceRulesTable,
  resourceSchedulesTable,
  resourcesTable,
} from "~/db/schemas/resources";
import UploadService from "~/services/upload";
import { mediasTable } from "~/db/schemas/media";
import { resourceSchema } from "~/utils/yup-schemas/resource";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { publish, thumbnail, schedules, images, facilities, rules, groups, ...validatedData } =
    await validateSchema({
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

  const [thumbnailData, imageData] = await Promise.all([
    UploadService.uploadSingle(thumbnail, "resources/thumbnails"),
    UploadService.uploadMultiple(images, "resources/media"),
  ]);

  const [[updatedResource]] = await Promise.all([
    db
      .update(resourcesTable)
      .set({ thumbnail: thumbnailData.url })
      .where(eq(resourcesTable.id, newResource.id))
      .returning(),

    db.insert(mediasTable).values(
      imageData.map(({ type, ...rest }) => ({
        mimeType: type,
        resource_id: newResource.id,
        ...rest,
      }))
    ),

    validatedData.schedule_type !== "24/7" && validatedData.schedules
      ? db.insert(resourceSchedulesTable).values(
          (validatedData.schedules as any[]).map((schedule) => ({
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
  } = await validateSchema({
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
