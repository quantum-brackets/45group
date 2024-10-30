import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { encode, getToken } from "next-auth/jwt";
import { and, eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { appError } from "~/utils/helpers";
import { COOKIE_MAX_AGE, SESSION_KEY } from "~/utils/constants";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("`email` is required"),
  });
  const { email } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

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
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return res;
});
