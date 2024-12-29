import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import { locationsTable } from "~/db/schemas/locations";
import { mediasTable } from "~/db/schemas/media";
import UploadService from "~/services/upload";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import YupValidation from "~/utils/yup-validations";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { images, ...validatedData } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      state: Yup.string().required("`state` is required"),
      city: Yup.string().required("`city` is required"),
      description: Yup.string().optional(),
      images: YupValidation.validateFiles().required("`images` is required"),
    },
    isFormData: true,
    data: body,
  });

  const imageUrls = await UploadService.uploadMultiple(
    images,
    `locations/${validatedData.state}/${validatedData.city}/${validatedData.name}`
  );

  const [newLocation] = await db
    .insert(locationsTable)
    .values({
      ...validatedData,
    })
    .returning();

  await Promise.all(
    imageUrls.map(({ url, size, type }) =>
      db.insert(mediasTable).values({
        url,
        size,
        mimeType: type,
        location_id: newLocation.id,
      })
    )
  );

  return NextResponse.json(newLocation);
});

export const GET = catchAsync(async () => {
  const locations = await db.select().from(locationsTable);

  return NextResponse.json(locations);
});
