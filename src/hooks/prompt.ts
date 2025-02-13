"use client";

import { useContext } from "react";
import { ConfirmationPromptContext } from "~/providers/confirmation-prompt";

type DialogProps = {
  title: string;
  description: string;
  confirmationText?: string;
  isLoading?: boolean;
};

const usePrompt = () => {
  const context = useContext(ConfirmationPromptContext);

  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  const { openPrompt } = context;

  return ({ ...props }: DialogProps) => openPrompt({ ...props });
};

export default usePrompt;
