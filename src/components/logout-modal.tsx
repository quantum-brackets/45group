"use client";

import { useRouter } from "next/navigation";
import { DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import Button from "./button";
import useAppStore from "~/store/app";
import Modal from "./modal";
import { useLogout } from "~/hooks/auth";

export default function LogoutModal() {
  const router = useRouter();

  const { isLogoutModalVisible: open, toggleLogoutModal } = useAppStore();

  const { mutateAsync: logout } = useLogout();

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
          onClick={async () => {
            await logout(undefined, {
              onSuccess: () => {
                handleClose();
                router.refresh();
              },
            });
          }}
        >
          Yes
        </Button>
        <Button onClick={handleClose} className="!w-fit" size="small">
          No
        </Button>
      </DialogActions>
    </Modal>
  );
}
