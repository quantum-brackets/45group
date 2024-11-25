"use client";

import { useCallback, useEffect, useState } from "react";
import { DialogContent, DialogTitle } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { Formik } from "formik";
import { isAxiosError } from "axios";
import Modal from "~/components/modal";
import * as Yup from "yup";
import OTPField from "~/components/fields/otp-field";
import { useRequestOtp, useVerifyOtp } from "~/hooks/auth";
import FormField from "~/components/fields/form-field";
import Button from "~/components/button";
import AuthService from "~/services/auth";
import { cn } from "~/utils/helpers";
import { notifyError } from "~/utils/toast";

type Props = {
  onClose: () => void;
  email: string;
};

const OTP_LENGTH = 6;

const validationSchema = {
  step1: Yup.object({
    otp: Yup.string()
      .length(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits`)
      .required("OTP is required"),
  }),
  step2: Yup.object({
    new_email: Yup.string().email("Invalid email address").required("Email is required"),
  }),
  step3: Yup.object({
    otp: Yup.string()
      .length(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits`)
      .required("OTP is required"),
  }),
};

export default function ChangeEmailModal({ onClose, email }: Props) {
  const [currentStep, changeCurrentStep] = useState<1 | 2 | 3>(1);
  const [count, setCount] = useState(60);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  const { mutateAsync: requestOtp, isPending: requestIsPending } = useRequestOtp();
  const { mutateAsync: verifyOtp } = useVerifyOtp();
  const { mutateAsync: changeEmail } = useMutation({
    mutationFn: AuthService.changeEmail,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });

  useEffect(() => {
    if (count > 0 && count < 60) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  const startCountdown = useCallback(() => setCount(59), []);

  const renderStepHeader = (stepNumber: number) => (
    <p
      className={
        "flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white"
      }
    >
      {stepNumber}
    </p>
  );

  const renderOtpResend = (otpEmail: string, isCurrentStep: boolean) => {
    if (!isCurrentStep) return null;

    return (
      <>
        <br />
        {count > 0 && count < 60 ? (
          <p>
            Retry in <span>{count}</span>
          </p>
        ) : (
          <button
            className="text-primary"
            type="button"
            onClick={async () =>
              await requestOtp(
                { email: otpEmail },
                {
                  onSuccess: () => {
                    startCountdown();
                  },
                }
              )
            }
            disabled={requestIsPending}
          >
            {requestIsPending ? "Loading..." : "Resend code"}
          </button>
        )}
      </>
    );
  };

  return (
    <Modal
      exitIcon={{
        display: true,
      }}
      open={true}
      onClose={onClose}
    >
      <DialogTitle>Change email address</DialogTitle>
      <DialogContent>
        <div className="flex flex-col gap-6 py-3">
          <Formik
            initialValues={{
              otp: "",
            }}
            onSubmit={async (values) => {
              await verifyOtp(
                { ...values, email },
                {
                  onSuccess: () => {
                    changeCurrentStep(2);
                  },
                }
              );
            }}
            enableReinitialize
            validationSchema={validationSchema.step1}
          >
            {({ handleSubmit, submitForm, isSubmitting, handleChange, setFieldValue, values }) => (
              <form
                method="POST"
                onSubmit={handleSubmit}
                className={cn("flex items-start gap-4", {
                  "items-center opacity-40": currentStep !== 1,
                })}
              >
                {renderStepHeader(1)}
                <div className="flex flex-col gap-2">
                  <small>
                    Enter verification code sent to <span className="font-semibold">{email}</span>
                    {renderOtpResend(email, currentStep === 1)}
                  </small>
                  {currentStep === 1 && (
                    <OTPField
                      name="otp"
                      required
                      TextFieldsProps={{
                        disabled: isSubmitting,
                      }}
                      className="ml-0 !gap-4"
                      length={OTP_LENGTH}
                      onChange={async (value) => {
                        await setFieldValue("otp", value);
                        if (value.length === OTP_LENGTH) {
                          await submitForm();
                        }
                      }}
                    />
                  )}
                </div>
              </form>
            )}
          </Formik>
          <Formik
            initialValues={{
              new_email: "",
            }}
            onSubmit={async ({ new_email }) => {
              await requestOtp(
                { email: new_email },
                {
                  onSuccess: () => {
                    setNewEmail(new_email);
                    changeCurrentStep(3);
                  },
                }
              );
            }}
            validateOnBlur={false}
            validationSchema={validationSchema.step2}
          >
            {({ handleSubmit }) => (
              <form
                method="POST"
                onSubmit={handleSubmit}
                className={cn("flex items-start gap-4", {
                  "items-center opacity-40": currentStep !== 2,
                })}
              >
                {renderStepHeader(2)}
                <div className="flex w-full flex-col gap-4">
                  <small>Enter your new address</small>
                  {currentStep === 2 && (
                    <div className="flex flex-col gap-2">
                      <FormField name="new_email" type="email" required />
                      <Button type="submit" className="w-fit">
                        Continue
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </Formik>
          <Formik
            initialValues={{
              otp: "",
            }}
            onSubmit={async ({ otp }) => {
              if (!newEmail) return;

              await verifyOtp(
                { email: newEmail, otp },
                {
                  onSuccess: async () => {
                    await changeEmail(
                      { new_email: newEmail },
                      {
                        onSuccess: () => {
                          changeCurrentStep(3);
                        },
                      }
                    );
                  },
                }
              );
            }}
            validateOnBlur={false}
            validationSchema={validationSchema.step2}
          >
            {({ handleSubmit, submitForm }) => (
              <form
                method="POST"
                onSubmit={handleSubmit}
                className={cn("flex items-start gap-4", {
                  "items-center opacity-40": currentStep !== 3,
                })}
              >
                {renderStepHeader(3)}
                <div className="flex flex-col gap-2">
                  <small>
                    Verify your new email address
                    {newEmail && renderOtpResend(newEmail, currentStep === 3)}
                  </small>
                  {currentStep === 3 && (
                    <OTPField
                      name="otp"
                      required
                      className="ml-0 !gap-4"
                      length={OTP_LENGTH}
                      onChange={async (value) => {
                        if (value.length !== OTP_LENGTH) return;
                        await submitForm();
                      }}
                    />
                  )}
                </div>
              </form>
            )}
          </Formik>
        </div>
      </DialogContent>
    </Modal>
  );
}
