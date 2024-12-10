import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { and, eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { appError, validateSchema } from "~/utils/helpers";
import { COOKIE_MAX_AGE, SESSION_KEY } from "~/utils/constants";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { email } = await validateSchema({
    object: {
      email: Yup.string().email("Invalid email address").required("`email` is required"),
    },
    data: body,
  });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.is_verified, true)));

  if (!user) {
    return appError({
      status: 400,
      error: "Verified user not found",
    });
  }

  const token = await encode({
    token: {
      id: user.id,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: COOKIE_MAX_AGE,
  });

  const res = NextResponse.json({
    message: "Session created",
  });

  res.cookies.set(SESSION_KEY, token, {
    httpOnly: true,
    sameSite: "strict", // Prevents cross-site access
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return res;
});
