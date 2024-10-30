import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import * as Yup from "yup";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY, SESSION_KEY } from "~/utils/constants";
import { appError } from "~/utils/helpers";
import axiosInstance from "~/config/axios";

export const PATCH = catchAsync(async (req: NextRequest) => {
  const userId = req.headers.get(HEADER_DATA_KEY) as string;

  const body = await req.json();

  const schema = Yup.object({
    first_name: Yup.string().trim().optional(),
    last_name: Yup.string().trim().optional(),
    phone: Yup.string()
      .optional()
      .test("valid-phone", "Please enter a valid phone number", (value) => {
        if (!value) return false;
        return isValidPhoneNumber(value);
      }),
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

  return NextResponse.json(updatedUser);
});

export const GET = catchAsync(async (req: NextRequest) => {
  const sessionToken =
    req.cookies.get(SESSION_KEY)?.value || req.headers.get("Authorization")?.split(" ")[1];
  if (!sessionToken) {
    return appError({ status: 401, error: "No session provided" });
  }

  const {
    data: { user_id },
  } = await axiosInstance.post("/api/utils/decode", { session: sessionToken });

  if (!user_id) {
    return appError({ status: 401, error: "Invalid session" });
  }

  console.log(user_id, "user_id");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, user_id));

  if (!user) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  console.log(user, "user");

  return NextResponse.json(user);
});
