"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@mui/material";
import { Formik } from "formik";
import * as Yup from "yup";
import { MuiTelInput, MuiTelInputProps, matchIsValidTel } from "mui-tel-input";

import nProgress from "nprogress";
import { IoPerson } from "react-icons/io5";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import Logo from "~/components/logo";
import { useUpdateMe } from "~/hooks/users";
import PhoneNumberField from "~/components/fields/phone-number-field";

const validationSchema = Yup.object({
  first_name: Yup.string().required("First name is required"),
  last_name: Yup.string().required("Last name is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .test("valid-phone", "Please enter a valid phone number", function (value) {
      if (!value) return false;
      return matchIsValidTel(value);
    }),
});

export default function CompleteProfile({
  searchParams: { origin },
}: {
  searchParams: { origin?: string };
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const { mutateAsync: updateMe } = useUpdateMe();

  const router = useRouter();

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-4">
        <Logo className="w-[3rem]" />
      </header>
      <main className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl largeMobile:text-lg">Complete Profile</h1>
          <small className="text-info-500 largeMobile:text-xs">
            We need some personal infomation from you.
          </small>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <Formik
            initialValues={{
              first_name: "",
              last_name: "",
              phone: "",
            }}
            validationSchema={validationSchema}
            onSubmit={async (data, { resetForm }) => {
              await updateMe(
                {
                  ...data,
                  complete_profile: true,
                },
                {
                  onSuccess: () => {
                    resetForm();
                    nProgress.start();
                    router.push(origin || "/booking");
                  },
                }
              );
            }}
            validateOnBlur={false}
          >
            {({ handleSubmit, isSubmitting, setFieldValue, values, initialValues }) => {
              const image = (values as typeof initialValues & { image?: File }).image;

              return (
                <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6">
                      <div className="!size-28 overflow-hidden rounded-full border border-black/15 bg-black/15">
                        <Avatar
                          className="!size-full"
                          src={image ? URL.createObjectURL(image) : ""}
                        >
                          <IoPerson className={"size-[40%]"} />
                        </Avatar>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs text-info-800">Upload your photo</h4>
                          <small className="text-[0.65rem] text-info-500">
                            Your photo should be in PNG, JPG or JPEG format.
                          </small>
                        </div>
                        <Button
                          variant="outlined"
                          color="info"
                          size="small"
                          className="!w-fit"
                          onClick={() => {
                            imageInputRef.current?.click();
                          }}
                        >
                          Upload
                        </Button>
                      </div>
                      <input
                        type="file"
                        ref={imageInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFieldValue("image", file);
                          }
                        }}
                      />
                    </div>
                    <FormField
                      name="first_name"
                      label="First Name"
                      required
                      placeholder="Enter your first name"
                    />
                    <FormField
                      name="last_name"
                      label="Last Name"
                      required
                      placeholder="Enter your last name"
                    />
                    <PhoneNumberField name="phone" label="Phone number" required />
                  </div>
                  <Button type="submit" size="large" loading={isSubmitting}>
                    Continue
                  </Button>
                </form>
              );
            }}
          </Formik>
        </div>
      </main>
    </main>
  );
}
