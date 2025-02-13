"use client";

import { createContext, useState, ReactNode, startTransition } from "react";
import ConfirmationPrompt from "~/components/confirmation-prompt";

type PromptProps = {
  title: string;
  description: string;
  isLoading?: boolean;
  confirmationText?: string;
};

type PromptState = PromptProps & {
  open: boolean;
  resolve: (value: boolean | PromiseLike<boolean>) => void;
};

type PromptContextProps = {
  openPrompt: (props: PromptProps) => Promise<boolean>;
};

export const ConfirmationPromptContext = createContext<PromptContextProps | undefined>(undefined);

export const ConfirmationPromptProvider = ({ children }: { children: ReactNode }) => {
  const [prompt, setPrompt] = useState<PromptState | null>(null);

  const openPrompt = ({ ...props }: PromptProps) => {
    return new Promise<boolean>((resolve) => {
      startTransition(() => {
        setPrompt({ open: true, ...props, resolve });
      });
    });
  };

  const closePrompt = () => {
    setPrompt((prev) => (prev ? { ...prev, open: false } : null));
  };

  const handleConfirm = () => {
    if (prompt) {
      prompt.resolve(true);
      closePrompt();
    }
  };

  const handleClose = () => {
    if (prompt && !prompt.isLoading) {
      prompt.resolve(false);
      closePrompt();
    }
  };

  return (
    <ConfirmationPromptContext.Provider value={{ openPrompt }}>
      {children}
      {prompt && prompt.open && (
        <ConfirmationPrompt
          {...prompt}
          open={true}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </ConfirmationPromptContext.Provider>
  );
};
