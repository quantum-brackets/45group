import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { Resource, ResourceSchedule, resourcesTable } from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import UploadService from "~/services/upload";
import YupValidation from "~/utils/yup-validations";
import { SCHEDULE_TYPE } from "~/utils/constants";
import { schedule } from "~/utils/yup-schemas/resource";

const resourceType = ["lodge", "event", "dining"];
const resourceStatus = ["draft", "published"];

const resourceSchema = {
  location_id: Yup.string().uuid("Location id not valid").optional(),
  name: Yup.string().optional(),
  type: Yup.string()
    .oneOf(resourceType, `Type must be one of: ${resourceType.join(", ")}`)
    .optional(),
  schedule_type: Yup.string()
    .lowercase()
    .oneOf(SCHEDULE_TYPE, `schedule_type must be one of: ${SCHEDULE_TYPE.join(", ")}`)
    .optional(),
  description: Yup.string().optional(),
  thumbnail: YupValidation.validateSingleFile({
    required: false,
  }),
  status: Yup.string()
    .lowercase()
    .oneOf(resourceStatus, `status must be one of: ${resourceStatus.join(", ")}`)
    .optional(),
  schedules: Yup.array()
    .of(schedule)
    .min(1, "`schedules` must have at least one schedule")
    .when("schedule_type", {
      is: (value: string) => value !== "24/7",
      otherwise: (schema) => schema.notRequired(),
    })
    .optional(),
};

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const [resource] = await db
    .delete(resourcesTable)
    .where(eq(resourcesTable.id, resourceId))
    .returning();

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json({ message: "Resource deleted successfully" });
});

export const GET = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const resource = await db.query.resourcesTable.findFirst({
    where: (resource, { eq }) => eq(resource.id, resourceId),
    with: {
      facilities: true,
      medias: true,
      location: true,
      groups: true,
      rules: true,
      schedules: true,
    },
  });

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json(resource);
});

export const PATCH = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.formData();

  const { thumbnail, ...validatedData } = await validateSchema<
    Partial<{
      name: string;
      type: Resource["type"];
      location_id: string;
      thumbnail: File;
      schedule_type: Resource["schedule_type"];
      publish: boolean;
      description: string;
      schedules: ResourceSchedule[];
    }>
  >({
    object: resourceSchema,
    isFormData: true,
    data: body,
  });

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.id, resourceId));

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  let thumbnailData;

  if (thumbnail) {
    thumbnailData = await UploadService.uploadSingle(thumbnail, "resources/thumbnails");
  }

  console.log(validatedData);

  const [updatedResource] = await db
    .update(resourcesTable)
    .set({ ...validatedData, thumbnail: thumbnailData?.url })
    .where(eq(resourcesTable.id, resourceId))
    .returning();

  return NextResponse.json(updatedResource);
});
