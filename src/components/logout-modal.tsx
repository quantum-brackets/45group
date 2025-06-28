"use client";

import { DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import Button from "./button";
import useAppStore from "~/store/app";
import Modal from "./modal";
import { useLogout } from "~/hooks/auth";

export default function LogoutModal() {
  const { isLogoutModalVisible: open, toggleLogoutModal } = useAppStore();

  const { mutateAsync: logout, isPending } = useLogout();

  function handleClose() {
    toggleLogoutModal(false);
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <DialogTitle>Please Confirm</DialogTitle>
      <DialogContent>
        <DialogContentText>Are you sure you want to log out?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="info"
          className="!w-fit"
          size="small"
          loading={isPending}
          onClick={async () => {
            await logout(undefined, {
              onSuccess: () => {
                handleClose();
                window.location.href = "/signin";
              },
            });
          }}
        >
          Yes
        </Button>
        <Button onClick={handleClose} className="!w-fit" size="small" disabled={isPending}>
          No
        </Button>
      </DialogActions>
    </Modal>
  );
}
