import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import { locationsTable } from "~/db/schemas/locations";
import YupValidation from "~/utils/yup-validations";
import UploadService from "~/services/upload";
import { mediasTable } from "~/db/schemas/media";

export const POST = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const locationId = context.params.id;
  const body = await req.formData();

  const { medias, name, state, city } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      state: Yup.string().required("`state` is required"),
      city: Yup.string().required("`city` is required"),
      medias: YupValidation.validateFiles().required("`medias` is required"),
    },
    isFormData: true,
    data: body,
  });

  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, locationId));

  if (!location)
    return appError({
      status: 404,
      error: "Location not found",
    });

  const mediaUrls = await UploadService.uploadMultiple(
    medias,
    `locations/${state}/${city}/${name}`
  );

  await Promise.all(
    mediaUrls.map(({ url, size, type }) =>
      db.insert(mediasTable).values({
        url,
        size,
        mimeType: type,
        location_id: location.id,
      })
    )
  );

  return NextResponse.json({ message: "Media Uploaded" });
});

export const DELETE = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const locationId = context.params.id;
  const body = await req.formData();

  const { media_ids } = await validateSchema({
    object: {
      media_ids: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).required(),
    },
    isFormData: true,
    data: body,
  });

  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, locationId));

  if (!location)
    return appError({
      status: 404,
      error: "Location not found",
    });

  await db
    .delete(mediasTable)
    .where(and(eq(mediasTable.location_id, locationId), inArray(mediasTable.id, media_ids)))
    .execute();

  return NextResponse.json({ message: "Media deleted" });
});
