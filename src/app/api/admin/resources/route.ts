import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import { resourceSchedulesTable, resourcesTable } from "~/db/schemas/resources";
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
};

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { publish, thumbnail, schedules, images, ...validatedData } = await validateSchema({
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
