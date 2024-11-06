import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { otpsTable } from "~/db/schemas/otps";
import { appError, hashValue } from "~/utils/helpers";
import { sendEmail } from "~/config/resend";
import WelcomeTemplate from "~/emails/welcome";

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
    .from(otpsTable)
    .where(
      and(
        eq(otpsTable.user_email, email),
        eq(otpsTable.hashed_otp, hashedOTP),
        gt(otpsTable.expires_at, currentTime)
      )
    );

  if (!validOTP) {
    return appError({
      status: 400,
      error: "The OTP does not exist or has expired.",
    });
  }

  const [existingUser] = await db
    .select({
      last_login_at: usersTable.last_login_at,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  await Promise.all([
    db.delete(otpsTable).where(eq(otpsTable.id, validOTP.id)),
    db
      .update(usersTable)
      .set({ last_login_at: currentTime, is_verified: true })
      .where(eq(usersTable.email, email))
      .returning(),
  ]);

  if (!existingUser?.last_login_at) {
    await sendEmail({
      to: email,
      subject: "Welcome to 45Group",
      react: WelcomeTemplate({
        previewText:
          "We're excited to have you join our platform where you can discover and book the finest lodges, events, and...",
      }),
    });
  }

  return NextResponse.json({
    message: "Account successfully verified",
  });
});
