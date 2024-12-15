import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { resourcesTable } from "~/db/schemas/resources";
import UploadService from "~/services/upload";

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
      thumbnail: Yup.mixed<File>()
        .required("`thumbnail` is required")
        .test("fileType", "Thumbnail must be an image file (jpeg, png, or jpg)", (value) => {
          if (!value) return false;
          const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
          return allowedFormats.includes(value.type);
        })
        .test("fileSize", "Thumbnail must be less than 2MB", (value) => {
          if (!value) return false;
          const maxSize = 5 * 1024 * 1024;
          return value.size <= maxSize;
        }),
      publish: Yup.boolean().isTrue(),
      images: Yup.array().of(
        Yup.mixed<File>()
          .required("`images` is required")
          .test(
            "fileType",
            "Each image must be a valid image file (jpeg, png, or jpg)",
            (value) => {
              if (!value) return false;
              const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
              return allowedFormats.includes(value.type);
            }
          )
          .test("fileSize", "Each image must be less than 5MB", (value) => {
            if (!value) return false;
            const maxSize = 5 * 1024 * 1024;
            return value.size <= maxSize;
          })
      ),
    },
    data: body,
  });

  const [thumbnailUrl, imageUrls] = await Promise.all([
    UploadService.uploadSingle(thumbnail, "resources/thumbnails"),
    UploadService.uploadMultiple(images, "resources/media"),
  ]);

  const newResource = await db
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
