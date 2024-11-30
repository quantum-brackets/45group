import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { otpsTable } from "~/db/schemas/otps";
import { hashValue, validateSchema } from "~/utils/helpers";
import { sendEmail } from "~/config/resend";
import RequestOtpTemplate from "~/emails/request-otp";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { email } = await validateSchema({
    object: {
      email: Yup.string().email("Invalid email address").required("Email is required"),
    },
    data: body,
  });

  const otp = generateOTP();
  const hashedOTP = hashValue(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  await db.insert(otpsTable).values({
    email,
    hashed_otp: hashedOTP,
    expires_at: expiresAt,
  });

  await sendEmail({
    to: email,
    subject: `Request OTP: ${otp}`,
    react: RequestOtpTemplate({
      code: otp,
      previewText: "Your one-time password (OTP) for 45Group account verification is ready...",
    }),
  });

  return NextResponse.json({
    message: "OTP sent to email",
  });
});
