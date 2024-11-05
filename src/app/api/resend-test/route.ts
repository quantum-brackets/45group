import { type NextRequest, NextResponse } from "next/server";
import { sendEmail } from "~/config/resend";
import RequestOtpTemplate from "~/emails/request-otp";
import catchAsync from "~/utils/catch-async";

export const GET = catchAsync(async (req: NextRequest) => {
  const email = "henzyd.dev@gmail.com";

  await sendEmail({
    to: email,
    subject: "Testing Emails",
    react: RequestOtpTemplate({ previewText: "Testing...", code: 595739 }),
  });

  return NextResponse.json({ message: `Email sent to ${email}` });
});
