"use client";

import { useState } from "react";
import { DialogActions, DialogContent, DialogTitle, OutlinedInput } from "@mui/material";
import Modal from "./modal";
import Button from "./button";
import { cn } from "~/utils/helpers";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmationText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmationPrompt({
  open,
  title,
  description,
  confirmationText,
  isLoading,
  onConfirm,
  onClose,
}: Props) {
  const [inputValue, setInputValue] = useState("");

  const isConfirmDisabled = confirmationText
    ? inputValue !== confirmationText || isLoading
    : isLoading;

  return (
    <Modal open={open} onClose={onClose}>
      <header className={cn(`flex flex-col gap-1 pb-8`, { "pb-2": confirmationText })}>
        <DialogTitle>{title}</DialogTitle>
        <p className="text-xs">{description}</p>
      </header>
      {confirmationText && (
        <DialogContent className="flex flex-col gap-2">
          <p className="text-xs">
            Please type <span className="font-semibold">{confirmationText}</span> to confirm:
          </p>
          <OutlinedInput
            className={cn("w-full !rounded-md !border-[0px] placeholder:!text-base")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationText}
            size="small"
          />
        </DialogContent>
      )}
      <DialogActions>
        <Button size="small" variant="outlined" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          size="small"
          onClick={() => {
            onConfirm();
          }}
          loading={isLoading}
          disabled={isConfirmDisabled}
        >
          Confirm
        </Button>
      </DialogActions>
    </Modal>
  );
}
