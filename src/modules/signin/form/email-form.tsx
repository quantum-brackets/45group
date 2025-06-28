"use client";

import { Formik } from "formik";
import * as Yup from "yup";
import FormField from "~/components/fields/form-field";
import Button from "~/components/button";
import { useRequestOtp } from "~/hooks/auth";

type Props = {
  showOtp: (obj: { open: boolean; email: string | null }) => void;
};

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email address").required("Email is required"),
});

export default function EmailForm({ showOtp }: Props) {
  const { mutateAsync: requestOtp, isPending } = useRequestOtp();

  return (
    <Formik
      initialValues={{
        email: "",
      }}
      validationSchema={validationSchema}
      onSubmit={async ({ email }, { resetForm }) => {
        await requestOtp(
          { email },
          {
            onSuccess: () => {
              showOtp({
                open: true,
                email,
              });
              resetForm();
            },
          }
        );
      }}
      validateOnBlur={false}
    >
      {({ handleSubmit }) => (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5" method="POST">
          <div className="flex flex-col gap-4">
            <FormField
              name="email"
              label="Email Address"
              type="email"
              required
              placeholder="Enter your email"
            />
          </div>
          <Button type="submit" size="large" loading={isPending}>
            Sign In
          </Button>
        </form>
      )}
    </Formik>
  );
}
