"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import nProgress from "nprogress";
import { Formik } from "formik";
import * as Yup from "yup";
import FormField from "~/components/fields/form-field";
import Button from "~/components/button";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

export default function LoginForm() {
  const router = useRouter();

  //  const { mutateAsync: login } = useLogin();

  return (
    <Formik
      initialValues={{
        email: "",
        password: "",
      }}
      validationSchema={validationSchema}
      onSubmit={async ({ email, password }, { resetForm }) => {
        // const response = await login({ email, password });

        // if (response) {
        nProgress.start();
        router.push("/");
        // }
      }}
      validateOnBlur={false}
    >
      {({ handleSubmit, isSubmitting }) => (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-4">
            <FormField
              name="email"
              label="Email Address"
              type="email"
              required
              placeholder="Enter your email"
            />
            <FormField
              name="password"
              label="Password"
              required
              type={"password"}
              placeholder="Create your password"
            />
            <div className="flex w-full items-center justify-end gap-4 mediumMobile:flex-col-reverse mediumMobile:gap-2">
              <Link
                href={"/forgot-password"}
                className="text-xs text-primary hover:underline mediumMobile:self-end"
              >
                Forgot Password?
              </Link>
            </div>
          </div>
          <Button type="submit" size="large" loading={isSubmitting}>
            Login
          </Button>
          <p className="flex w-full justify-center gap-1 text-xs text-info-600">
            Don’t have an account?
            <Link href={"/signup"} className="text-primary hover:underline">
              Signup
            </Link>
          </p>
        </form>
      )}
    </Formik>
  );
}
