import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verify as JwtVerify } from "jsonwebtoken";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { appError, signJwt } from "~/utils/helpers";
import { blacklistedTokenTable } from "~/db/schemas/blacklisted-token";
import { COOKIE_MAX_AGE, JWT_KEY } from "~/utils/constants";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    refresh: Yup.string().required("`refresh` is required"),
  });
  const { refresh } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

  const { user_id } = JwtVerify(refresh, process.env.JWT_SECRET as string) as {
    user_id: string;
    iat: number;
    exp: number;
  };

  const [blacklistedToken] = await db
    .select()
    .from(blacklistedTokenTable)
    .where(eq(blacklistedTokenTable.token, refresh));

  if (blacklistedToken) {
    return appError({
      status: 401,
      error: "Token has been revoked",
    });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, user_id));

  if (!user) {
    return appError({
      status: 404,
      error: "User not found",
    });
  }

  await db.insert(blacklistedTokenTable).values({
    token: refresh,
    blacklisted_at: new Date(),
  });

  const access = signJwt.access(user.id);
  const newRefresh = signJwt.refresh(user.id);

  const response = NextResponse.json({
    access,
    refresh: newRefresh,
  });

  response.cookies.set(JWT_KEY, newRefresh, {
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
});
