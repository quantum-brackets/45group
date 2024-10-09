"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik } from "formik";
import * as Yup from "yup";
import nProgress from "nprogress";
import { useVerifyOtp, useRequestOtp } from "~/hooks/auth";
import OTPField from "~/components/fields/otp-field";
import Button from "~/components/button";

type Props = {
  email: string;
};

const validationSchema = {
  otp: Yup.string().required("OTP is required"),
};

export default function OTPForm({ email }: Props) {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const { mutateAsync: requestOtp, isPending: requestIsPending } = useRequestOtp();

  return (
    <div className="flex flex-col gap-4">
      <Formik
        initialValues={{
          otp: "",
        }}
        validationSchema={validationSchema}
        onSubmit={async ({ otp }, { resetForm }) => {
          await verifyOtp(
            { email, otp },
            {
              onSuccess: () => {
                nProgress.start();
                router.push("/");
              },
            }
          );
        }}
        validateOnBlur={false}
      >
        {({ handleSubmit, isSubmitting }) => (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
            <OTPField name="otp" required length={6} />
            <Button
              type="submit"
              size="large"
              loading={isSubmitting}
              disabled={nProgress.isStarted()}
            >
              Confirm
            </Button>
          </form>
        )}
      </Formik>
      <small className="text-xs text-info-600">
        Having troubles with otp?{" "}
        <button
          className="text-primary"
          onClick={async () => {
            await requestOtp({ email });
          }}
          disabled={requestIsPending}
        >
          {requestIsPending ? "Loading..." : "Request new OTP"}
        </button>
      </small>
    </div>
  );
}
