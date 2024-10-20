"use client";

import { useRef } from "react";
import { Avatar, Skeleton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Formik } from "formik";
import { IoPerson, IoCameraOutline } from "react-icons/io5";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import { useUpdateMe } from "~/hooks/users";
import { notifySuccess } from "~/utils/toast";

export default function Profile() {
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const { data: currentUser, isLoading } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            first_name: "Uchechukwu",
            last_name: "Anachuna",
            image: "https://picsum.photos/200",
          } as User);
        }, 5000);
      });
    },
  });

  const { mutateAsync: updateMe } = useUpdateMe();

  return (
    <main className="flex flex-col gap-10">
      <Typography variant="h6">My Profile</Typography>
      <Formik
        initialValues={{
          first_name: currentUser?.first_name || "",
          last_name: currentUser?.last_name || "",
          image: currentUser?.image || "",
          email: currentUser?.email || "",
        }}
        onSubmit={async ({ email: _, image: __, ...data }) => {
          await updateMe(data, {
            onSuccess: () => {
              notifySuccess({ message: "Profile updated successfully" });
            },
          });
        }}
        validateOnBlur={false}
        enableReinitialize
      >
        {({ handleSubmit, isSubmitting, initialValues }) => (
          <div className="flex gap-12">
            {isLoading ? (
              <div>
                <Skeleton className="!size-40" variant="circular" />
              </div>
            ) : (
              <div>
                <button
                  className="relative !size-40 overflow-hidden rounded-full border border-[#0000001c] bg-[#00000021]"
                  onClick={() => profileImageInputRef.current?.click()}
                >
                  <Avatar className="!size-full" src={currentUser?.image || ""}>
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
                    }
                  }}
                />
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  name="first_name"
                  label="First Name"
                  required
                  placeholder={initialValues.first_name}
                />
                <FormField
                  name="last_name"
                  label="Last Name"
                  required
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
              </div>
              <div className="flex justify-end">
                <Button loading={isSubmitting} type="submit">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        )}
      </Formik>
    </main>
  );
}
