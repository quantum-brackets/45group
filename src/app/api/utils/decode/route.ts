import { decode } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import catchAsync from "~/utils/catch-async";

export const POST = catchAsync(async (req: NextRequest) => {
  const { session } = await req.json();
  console.log(session, "/utils.decode");

  const data = await decode({
    secret: process.env.NEXTAUTH_SECRET!,
    token: session,
  });

  console.log(data, "data");

  return NextResponse.json({ user_id: data?.id });
});
