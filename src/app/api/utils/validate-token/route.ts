import { NextResponse, type NextRequest } from "next/server";
import { verify as JwtVerify } from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { blacklistedTokenTable } from "~/db/schemas/blacklisted-token";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const POST = catchAsync(async (req: NextRequest) => {
  const { token } = await req.json();
  const { user_id } = JwtVerify(token, process.env.JWT_SECRET as string) as {
    user_id: string;
  };

  const [blacklistedToken] = await db
    .select()
    .from(blacklistedTokenTable)
    .where(eq(blacklistedTokenTable.token, token));

  if (blacklistedToken) {
    return appError({
      status: 401,
      error: "Token has been revoked",
    });
  }

  return NextResponse.json({
    user_id,
  });
});
