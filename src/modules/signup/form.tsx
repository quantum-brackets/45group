"use client";

import Link from "next/link";
import { Checkbox } from "@mui/material";
import nProgress from "nprogress";
import { ImCheckboxUnchecked } from "react-icons/im";
import { FaCheckSquare } from "react-icons/fa";
import { Formik } from "formik";
import * as Yup from "yup";
import FormField from "~/components/fields/form-field";
import Button from "~/components/button";
import { passwordRegex } from "~/utils/constants";

const validationSchema = Yup.object({
  first_name: Yup.string().trim().required("First name is required"),
  last_name: Yup.string().trim().required("Last name is required"),
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(
      passwordRegex,
      "Password must include at least one lowercase letter, one uppercase letter, one digit, and one special character"
    )
    .required("Password is required"),
});

export default function SignupForm() {
  return (
    <Formik
      initialValues={{
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        phone: "",
        agreed: false,
      }}
      validationSchema={validationSchema}
      onSubmit={async ({ agreed, ...values }, { resetForm }) => {
        if (!agreed) {
          return;
        }

        // const response = await signup({
        //   ...values,
        //   password,
        //   email,
        // });

        // setShowOtpModal({
        //   ...showOtpModal,
        //   password,
        // });
        resetForm();
      }}
      validateOnBlur={false}
    >
      {({ handleSubmit, isSubmitting, setFieldValue, values }) => (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <FormField
              label="First Name"
              required
              placeholder="Enter first name"
              name="first_name"
            />
            <FormField label="Last Name" required placeholder="Enter last name" name="last_name" />
            <FormField
              label="Email Address"
              required
              placeholder="Enter your email"
              name="email"
              type="email"
            />
            <FormField
              name="password"
              label="Password"
              required
              type={"password"}
              placeholder="Create a password"
            />
          </div>
          <div className="flex items-center gap-1 mediumMobile:self-start">
            <Checkbox
              onChange={() => {
                setFieldValue("agreed", !values.agreed);
              }}
              icon={<ImCheckboxUnchecked className="text-sm" />}
              checkedIcon={<FaCheckSquare className="text-[0.9rem]" />}
              checked={values.agreed}
              name="agreed"
              size="small"
            />
            <small className="text-xs">
              By continuing you’re agreeing to 45Group’s{" "}
              <Link href={"/terms"} className="text-primary underline">
                Terms of Service and Privacy Policy
              </Link>
            </small>
          </div>
          <Button disabled={!values.agreed} type="submit" loading={isSubmitting} className="!mt-2">
            Create Account
          </Button>
          <p className="flex w-full justify-center gap-2 text-xs text-info-600">
            Already have an account?
            <Link href={"/login"} className="text-primary hover:underline">
              Log In
            </Link>
          </p>
        </form>
      )}
    </Formik>
  );
}
