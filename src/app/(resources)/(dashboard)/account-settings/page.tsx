"use client";

import { useState } from "react";
import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import UsersService from "~/services/users";
import ChangeEmailModal from "~/modules/account-settings/change-email";
import { useRequestOtp } from "~/hooks/auth";

export default function AccountSettings() {
  const [openChangeEmailModal, toggleChangeEmailModal] = useState(false);

  const { mutateAsync: requestOtp } = useRequestOtp();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
  });

  return (
    <>
      <main className="flex flex-col gap-10 tablet_768:gap-6">
        <Typography variant="h1">Account Settings</Typography>
        <div className="flex max-w-[500px] flex-col gap-4">
          <h4 className="text-base font-semibold largeMobile:text-sm">Email Address</h4>
          <div className="flex w-full items-center justify-between gap-8">
            <p className="text-sm text-zinc-800 largeMobile:text-xs">
              Your email address is <span className="font-semibold">{currentUser?.email}</span>
            </p>
            {currentUser?.email && (
              <button
                onClick={() => {
                  toggleChangeEmailModal(true);
                  requestOtp({ email: currentUser.email });
                }}
                className="text-sm font-medium text-primary underline largeMobile:text-xs"
              >
                Change
              </button>
            )}
          </div>
        </div>
      </main>
      {currentUser?.email && openChangeEmailModal && (
        <ChangeEmailModal onClose={() => toggleChangeEmailModal(false)} email={currentUser.email} />
      )}
    </>
  );
}
