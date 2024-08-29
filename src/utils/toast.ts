import { ExternalToast, toast } from "sonner";

type Params = Omit<ExternalToast, "description"> & {
  message: string;
  description?: string;
};

export const notifySuccess = ({ message, description }: Params) =>
  toast.success(message, {
    description,
  });

export const notifyError = ({ message, description }: Params) =>
  toast.error(message, {
    description,
  });

export const notifyInfo = ({ message, description }: Params) =>
  toast.info(message, {
    description,
  });
