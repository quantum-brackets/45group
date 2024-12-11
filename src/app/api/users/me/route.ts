import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import * as Yup from "yup";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY } from "~/utils/constants";
import { appError, validateSchema } from "~/utils/helpers";
import { uploadFileToS3 } from "~/utils/s3";

//! check if user exist first before upload to s3

export const PATCH = catchAsync(async (req: NextRequest) => {
  const middlewareData = req.headers.get(HEADER_DATA_KEY);
  const { userId }: { userId: string } = middlewareData ? JSON.parse(middlewareData) : {};
  console.log(userId);

  const formData = await req.formData();
  const body = Object.fromEntries(formData);

  const { image, ...validatedData } = await validateSchema({
    object: {
      first_name: Yup.string().trim().optional(),
      last_name: Yup.string().trim().optional(),
      phone: Yup.string()
        .test("valid-phone", "Please enter a valid phone number", (value) => {
          return !value || isValidPhoneNumber(value);
        })
        .optional(),
      complete_profile: Yup.boolean().optional(),
      image: Yup.mixed().optional(),
    },
    data: body,
  });

  let imageUrl = null;
  if (image) {
    const filename = `profiles/${(image as File).name}`;

    const arrayBuffer = await (image as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { VersionId } = await uploadFileToS3(buffer, filename);
    imageUrl = `${process.env.BASE_URL}/api/assets/${filename}?versionId=${VersionId}`;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      ...validatedData,
      image: imageUrl,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updatedUser) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  return NextResponse.json(updatedUser);
});

export const GET = catchAsync(async (req: NextRequest) => {
  const middlewareData = req.headers.get(HEADER_DATA_KEY);
  const { userId }: { userId: string } = middlewareData ? JSON.parse(middlewareData) : {};
  console.log(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  return NextResponse.json(user);
});
