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
import YupValidation from "~/utils/yup-validations";
import { mediasTable } from "~/db/schemas/media";

const resourceType = ["lodge", "event", "dining"];
const scheduleType = ["24/7", "custom", "weekdays", "weekends"];
const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const schedule = Yup.object({
  start_time: Yup.string().required("`start_time` is required"),
  end_time: Yup.string().required("`end_time` is required"),
  day_of_week: Yup.string()
    .oneOf(daysOfWeek, "`day_of_week` must be one of: " + daysOfWeek.join(", "))
    .required("`day_of_week` is required"),
});

const schema = {
  location_id: Yup.string().uuid("Location id not valid"),
  name: Yup.string().required("`name` is required"),
  type: Yup.string()
    .oneOf(resourceType, `Type must be one of: ${resourceType.join(", ")}`)
    .required("`type` is required"),
  schedule_type: Yup.string()
    .oneOf(scheduleType, `schedule_type must be one of: ${scheduleType.join(", ")}`)
    .required("`schedule_type` is required"),
  description: Yup.string().required("`description` is required"),
  thumbnail: YupValidation.validateSingleFile({
    requiredMessage: "`thumbnail` is required",
    fileSizeMessage: "`thumbnail` must be less than 5MB",
  }),
  publish: Yup.boolean().isTrue().optional(),
  images: YupValidation.validateFiles({
    requiredMessage: "`images` is required",
  }).required("`images` is required`"),
  schedules: Yup.array()
    .of(schedule)
    .min(1, "`schedules` must have at least one schedule")
    .when("schedule_type", {
      is: (value: string) => value !== "24/7",
      then: (schema) => schema.required("`schedules` is required when `schedule_type` is not 24/7"),
      otherwise: (schema) => schema.notRequired(),
    }),
  rules: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).optional(),
  facilities: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).optional(),
  groups: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).optional(),
};

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { publish, thumbnail, schedules, images, facilities, rules, groups, ...validatedData } =
    await validateSchema({
      object: schema,
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

    rules?.length
      ? db.insert(resourceRulesTable).values(
          rules.map((rule_id: string) => ({
            resource_id: newResource.id,
            rule_id,
          }))
        )
      : Promise.resolve(),

    facilities?.length
      ? db.insert(resourceFacilitiesTable).values(
          facilities.map((facility_id: string) => ({
            resource_id: newResource.id,
            facility_id,
          }))
        )
      : Promise.resolve(),

    groups?.length
      ? db.insert(resourceGroupsTable).values(
          groups.map((group_id: string) => ({
            resource_id: newResource.id,
            group_id,
          }))
        )
      : Promise.resolve(),

    db.insert(mediasTable).values(
      imageData.map(({ type, ...rest }) => ({
        mimeType: type,
        resourceId: newResource.id,
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
