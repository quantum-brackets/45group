import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { users } from "~/db/schemas/users";
import { otps } from "~/db/schemas/otps";
import { hashValue } from "~/utils/helpers";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
  });
  const { email } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Email doesn't exist",
      },
      {
        status: 400,
      }
    );
  }

  const otp = generateOTP();
  const hashedOTP = hashValue(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

  await db.insert(otps).values({
    user_email: user.email,
    hashed_otp: hashedOTP,
    expires_at: expiresAt,
  });

  //? Send to email

  return NextResponse.json({
    success: true,
    message: "OTP sent to email",
  });
});
