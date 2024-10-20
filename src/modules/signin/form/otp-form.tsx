"use client";

import { useRouter } from "next/navigation";
import { Formik } from "formik";
import * as Yup from "yup";
import nProgress from "nprogress";
import { useVerifyOtp, useRequestOtp, useCreateJwt } from "~/hooks/auth";
import OTPField from "~/components/fields/otp-field";
import Button from "~/components/button";

type Props = {
  email: string;
  origin?: string;
};

const validationSchema = Yup.object({
  otp: Yup.string().length(6, "OTP must be 6 digits").required("OTP is required"),
});

const OTP_LENGTH = 6;

export default function OTPForm({ email, origin }: Props) {
  const router = useRouter();

  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const { mutateAsync: requestOtp, isPending: requestIsPending } = useRequestOtp();
  const { mutateAsync: createJwt } = useCreateJwt();

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
              onSuccess: async () => {
                await createJwt(
                  { email },
                  {
                    onSuccess: () => {
                      resetForm();
                      nProgress.start();
                      router.push(origin || "/booking");
                    },
                  }
                );
              },
            }
          );
        }}
        validateOnBlur={false}
      >
        {({ handleSubmit, isSubmitting, values }) => (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
            <OTPField name="otp" required length={OTP_LENGTH} />
            <Button
              type="submit"
              size="large"
              loading={isSubmitting}
              disabled={nProgress.isStarted() || values.otp.length !== OTP_LENGTH}
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
