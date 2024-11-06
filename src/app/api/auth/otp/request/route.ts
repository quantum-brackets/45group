import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { otpsTable } from "~/db/schemas/otps";
import { appError, hashValue } from "~/utils/helpers";
import { sendEmail } from "~/config/resend";
import RequestOtpTemplate from "~/emails/request-otp";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
  });
  const { email } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    return appError({
      error: "Email doesn't exist",
      status: 400,
    });
  }

  const otp = generateOTP();
  const hashedOTP = hashValue(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  await db.insert(otpsTable).values({
    user_email: user.email,
    hashed_otp: hashedOTP,
    expires_at: expiresAt,
  });

  await sendEmail({
    to: email,
    subject: "45Group - Request OTP",
    react: RequestOtpTemplate({
      code: otp,
      previewText: "Your one-time password (OTP) for 45Group account verification is ready...",
    }),
  });

  return NextResponse.json({
    message: "OTP sent to email",
  });
});
