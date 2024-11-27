import { NextRequest, NextResponse } from "next/server";
import { db } from "~/db";
import { blacklistedTokenTable } from "~/db/schemas/blacklisted-token";
import { SESSION_KEY } from "~/utils/constants";
import catchAsync from "~/utils/catch-async";

export const POST = catchAsync(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_KEY)?.value as string;

  await db.insert(blacklistedTokenTable).values({
    token,
    blacklisted_at: new Date(),
  });

  const res = NextResponse.json({
    message: "User logged out successfully",
  });

  res.cookies.delete(SESSION_KEY);

  return res;
});
