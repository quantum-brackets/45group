"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Formik } from "formik";
import * as Yup from "yup";
import nProgress from "nprogress";
import { useVerifyOtp, useRequestOtp, useCreateSession, useSignin } from "~/hooks/auth";
import OTPField from "~/components/fields/otp-field";
import Button from "~/components/button";
import { notifySuccess } from "~/utils/toast";

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

  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(60);

  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const { mutateAsync: signin } = useSignin();
  const { mutateAsync: requestOtp, isPending: requestIsPending } = useRequestOtp();
  const { mutateAsync: createSession } = useCreateSession();

  useEffect(() => {
    if (count > 0 && count < 60) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const startCountdown = () => setCount(59);

  return (
    <div className="flex flex-col gap-4">
      <Formik
        initialValues={{
          otp: "",
        }}
        validationSchema={validationSchema}
        onSubmit={async ({ otp }, { resetForm }) => {
          setIsLoading(true);
          await verifyOtp(
            { email, otp },
            {
              onSuccess: async () => {
                await signin(
                  { email },
                  {
                    onSuccess: async () => {
                      await createSession(
                        { email },
                        {
                          onSuccess: () => {
                            notifySuccess({ message: "Signed in successfully" });
                            resetForm();
                            nProgress.start();
                            router.push(origin || "/booking");
                          },
                          onSettled: () => {
                            setIsLoading(false);
                          },
                        }
                      );
                    },
                  }
                );
              },
              onError: () => {
                setIsLoading(false);
              },
            }
          );
        }}
        validateOnBlur={false}
      >
        {({ handleSubmit, values }) => (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" method="POST">
            <OTPField name="otp" required length={OTP_LENGTH} />
            <Button
              type="submit"
              size="large"
              loading={isLoading}
              disabled={nProgress.isStarted() || values.otp.length !== OTP_LENGTH}
            >
              Confirm
            </Button>
          </form>
        )}
      </Formik>
      <small className="flex gap-1 text-xs text-info-600">
        Having troubles with otp?{" "}
        {count > 0 && count < 60 ? (
          <p>
            Retry in <span>{count}</span>
          </p>
        ) : (
          <button
            className="text-primary"
            onClick={async () => {
              await requestOtp(
                { email },
                {
                  onSuccess: () => {
                    startCountdown();
                  },
                }
              );
            }}
            disabled={requestIsPending}
          >
            {requestIsPending ? "Loading..." : "Request new OTP"}
          </button>
        )}
      </small>
    </div>
  );
}
