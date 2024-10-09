"use client";

import { DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import Button from "./button";
import useAppStore from "~/store/app";
import Modal from "./modal";

export default function LogoutModal() {
  const { isLogoutModalVisible: open, toggleLogoutModal } = useAppStore();

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
            handleClose();
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
