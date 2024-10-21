import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY, phoneRegExp } from "~/utils/constants";
import { appError } from "~/utils/helpers";

export const PATCH = catchAsync(async (req: NextRequest) => {
  const userId = req.headers.get(HEADER_DATA_KEY) as string;

  const body = await req.json();

  const schema = Yup.object({
    first_name: Yup.string().trim().optional(),
    last_name: Yup.string().trim().optional(),
    phone: Yup.string()
      .matches(phoneRegExp, "Phone number is not valid")
      .optional()
      .test(
        "len",
        "Phone number must be between 10 and 15 characters",
        (val) => !val || (val.length >= 10 && val.length <= 15)
      ),
    complete_profile: Yup.boolean().optional(),
  });
  const validatedData = await schema.validate(
    { ...body },
    { abortEarly: false, stripUnknown: true }
  );

  const [updatedUser] = await db
    .update(usersTable)
    .set(validatedData)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updatedUser) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  return NextResponse.json({
    success: true,
    user: updatedUser,
  });
});

export const GET = catchAsync(async (req: NextRequest) => {
  const userId = req.headers.get(HEADER_DATA_KEY) as string;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  return NextResponse.json({
    success: true,
    user,
  });
});
