import { type NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { blacklistedTokenTable } from "~/db/schemas/blacklisted-token";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const POST = catchAsync(async (req: NextRequest) => {
  const { session } = await req.json();

  const [blacklistedToken] = await db
    .select()
    .from(blacklistedTokenTable)
    .where(eq(blacklistedTokenTable.token, session));

  if (blacklistedToken) {
    return appError({
      status: 400,
      error: "Token is blacklisted",
    });
  }

  const data = await decode({
    secret: process.env.NEXTAUTH_SECRET!,
    token: session,
  });

  return NextResponse.json({ user_id: data?.id });
});
