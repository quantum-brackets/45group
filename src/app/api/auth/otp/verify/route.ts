import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { users } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { otps } from "~/db/schemas/otps";
import { hashValue } from "~/utils/helpers";
import { sendEmail } from "~/config/resend";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
    otp: Yup.string()
      .length(6, "OTP must be exactly 6 digits")
      .matches(/^\d{6}$/, "OTP must be 6 digits")
      .required("OTP is required"),
  });
  const { email, otp } = await schema.validate(
    { ...body },
    { abortEarly: false, stripUnknown: true }
  );

  const hashedOTP = hashValue(otp);
  const currentTime = new Date();

  const [validOTP] = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.user_email, email),
        eq(otps.hashed_otp, hashedOTP),
        gt(otps.expires_at, currentTime)
      )
    );

  if (!validOTP) {
    return NextResponse.json({
      success: false,
      message: "The OTP does not exist or has expired.",
    });
  }

  await Promise.all([
    db.delete(otps).where(eq(otps.id, validOTP.id)),
    db
      .update(users)
      .set({ last_login_at: currentTime, is_verified: true })
      .where(eq(users.email, email)),
  ]);

  await sendEmail({
    to: email,
    subject: "Welcome to 45Group",
    text: "Hello and Welcome",
  });

  return NextResponse.json({
    success: true,
    message: "Account successfully verified",
  });
});
