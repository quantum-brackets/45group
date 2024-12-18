"use client";

import { useMemo, useRef } from "react";
import { Avatar, Skeleton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Formik } from "formik";
import * as Yup from "yup";
import { matchIsValidTel } from "mui-tel-input";
import { IoPerson, IoCameraOutline } from "react-icons/io5";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import { useUpdateMe } from "~/hooks/users";
import { notifySuccess } from "~/utils/toast";
import UsersService from "~/services/users";
import PhoneNumberField from "~/components/fields/phone-number-field";
import { compareObjectValues, filterPrivateValues } from "~/utils/helpers";

const validationSchema = Yup.object({
  first_name: Yup.string().optional(),
  last_name: Yup.string().optional(),
  phone: Yup.string()
    .optional()
    .test("valid-phone", "Please enter a valid phone number", (value) => {
      if (!value) return false;
      return matchIsValidTel(value);
    }),
});

export default function Profile() {
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
  });

  const { mutateAsync: updateMe } = useUpdateMe();

  const initialValues = useMemo(
    () => ({
      first_name: currentUser?.first_name || "",
      last_name: currentUser?.last_name || "",
      image: currentUser?.image || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
    }),
    [currentUser]
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex flex-col gap-10 tablet_768:gap-6">
      <Typography variant="h1">My Profile</Typography>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async ({ email: _, ...values }) => {
          const submissionValues = compareObjectValues(initialValues, filterPrivateValues(values));

          await updateMe(submissionValues, {
            onSuccess: () => {
              notifySuccess({ message: "Profile updated successfully" });
            },
          });
        }}
        validateOnBlur={false}
        enableReinitialize
      >
        {({ handleSubmit, isSubmitting, initialValues, setFieldValue, values }) => {
          return (
            <div className="flex gap-12 tablet_768:flex-col tablet_768:gap-6">
              <div>
                <button
                  className="relative size-40 overflow-hidden rounded-full border border-[#0000001c] bg-[#00000021] largeMobile_545:!size-24 tablet_768:size-32"
                  onClick={() => profileImageInputRef.current?.click()}
                >
                  <Avatar
                    className="!size-full"
                    src={
                      (values as typeof values & { _image_base64?: string })._image_base64 ||
                      values.image
                    }
                  >
                    <IoPerson className={"size-[40%]"} />
                  </Avatar>
                  <div className="absolute bottom-0 flex h-[40%] w-full items-center justify-center bg-black/35">
                    <IoCameraOutline className="mb-5 size-[50%] text-white" />
                  </div>
                </button>
                <input
                  type="file"
                  ref={profileImageInputRef}
                  className="hidden"
                  accept="png,jpg,jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => {
                        setFieldValue("image", file);
                        setFieldValue(`_image_base64`, reader.result);
                      };
                    }
                  }}
                />
              </div>
              <form onSubmit={handleSubmit} className="flex w-full flex-col gap-12">
                <div className="grid grid-cols-2 gap-6 largeMobile:grid-cols-1">
                  <FormField
                    name="first_name"
                    label="First Name"
                    placeholder={initialValues.first_name}
                  />
                  <FormField
                    name="last_name"
                    label="Last Name"
                    placeholder={initialValues.last_name}
                  />
                  <div className="flex flex-col gap-1">
                    <label htmlFor="email" className="text-xs">
                      Email
                    </label>
                    <p id={"email"} className="py-[10.5px] pl-[14px] pr-[10px] text-[0.8rem]">
                      {initialValues.email}
                    </p>
                  </div>
                  <PhoneNumberField
                    name="phone"
                    label="Phone number"
                    placeholder={initialValues.phone}
                  />
                </div>
                <div className="flex justify-end">
                  <Button loading={isSubmitting} type="submit">
                    Save changes
                  </Button>
                </div>
              </form>
            </div>
          );
        }}
      </Formik>
    </main>
  );
}
