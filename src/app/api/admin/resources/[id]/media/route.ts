import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import { mediasTable } from "~/db/schemas/media";
import { resourcesTable } from "~/db/schemas/resources";
import UploadService from "~/services/upload";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import YupValidation from "~/utils/yup-validations";

export const POST = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.formData();

  const { medias } = await validateSchema({
    object: {
      medias: YupValidation.validateFiles().required("`medias` is required"),
    },
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

  const mediaUrls = await UploadService.uploadMultiple(medias, `resources/media`);

  await Promise.all(
    mediaUrls.map(({ url, size, type }) =>
      db.insert(mediasTable).values({
        url,
        size,
        mimeType: type,
        resource_id: resource.id,
      })
    )
  );

  return NextResponse.json({ message: "Media Uploaded" });
});

export const DELETE = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.formData();

  const { media_ids } = await validateSchema({
    object: {
      media_ids: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).required(),
    },
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

  await db
    .delete(mediasTable)
    .where(and(eq(mediasTable.resource_id, resourceId), inArray(mediasTable.id, media_ids)))
    .execute();

  return NextResponse.json({ message: "Media deleted" });
});
