"use client";

import { Suspense, useState } from "react";
import EmailForm from "./email-form";
import OTPForm from "./otp-form";

type Props = {
  origin?: string;
};

export default function SiginForm({ origin }: Props) {
  const [otpForm, setOtpForm] = useState<{
    open: boolean;
    email: string | null;
  }>({
    open: false,
    email: null,
  });

  return (
    <div>
      {otpForm.open && otpForm.email ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl largeMobile:text-lg">Enter OTP Code</h1>
            <small className="text-center text-info-500 largeMobile:text-xs">
              Check your email and enter the code we sent to verify your account.
            </small>
          </div>
          <div className="flex w-full flex-col items-center gap-4">
            <OTPForm email={otpForm.email} origin={origin} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl largeMobile:text-lg">Welcome</h1>
            <small className="text-info-500 largeMobile:text-xs">
              Please enter your email to continue.
            </small>
          </div>
          <div className="flex w-full flex-col items-center gap-4">
            <EmailForm showOtp={(obj: typeof otpForm) => setOtpForm(obj)} />
          </div>
        </div>
      )}
    </div>
  );
}
