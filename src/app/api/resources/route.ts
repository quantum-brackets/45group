import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { resourcesTable } from "~/db/schemas/resources";
import UploadService from "~/services/upload";
import YupValidation from "~/utils/yup-validations";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { publish, thumbnail, images, ...validatedData } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      location: Yup.string().required("`location` is required"),
      type: Yup.string()
        .oneOf(["lodge", "event", "restaurant"], "Type must be one of: lodge, event, restaurant")
        .required("`type` is required"),
      description: Yup.string().required("`description` is required"),
      thumbnail: YupValidation.validateSingleFile({
        requiredMessage: "`thumbnail` is required",
        fileSizeMessage: "Thumbnail must be less than 5MB",
      }),
      publish: Yup.boolean().isTrue(),
      images: YupValidation.validateFiles({
        requiredMessage: "`images` is required",
      }),
    },
    data: body,
  });

  const [thumbnailUrl, imageUrls] = await Promise.all([
    UploadService.uploadSingle(thumbnail, "resources/thumbnails"),
    UploadService.uploadMultiple(images, "resources/media"),
  ]);

  const [newResource] = await db
    .insert(resourcesTable)
    .values({
      ...(validatedData as any),
      status: publish ? "published" : "draft",
      thumbnail: thumbnailUrl,
      images: imageUrls,
    })
    .returning();

  return NextResponse.json(newResource);
});
