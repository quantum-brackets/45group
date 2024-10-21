import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { appError, signJwt } from "~/utils/helpers";
import { COOKIE_MAX_AGE, JWT_KEY } from "~/utils/constants";

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

  const access = signJwt.access(user.id);
  const refresh = signJwt.refresh(user.id);

  const response = NextResponse.json({
    success: true,
    access,
    refresh,
  });

  response.cookies.set(JWT_KEY, refresh, {
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
});
