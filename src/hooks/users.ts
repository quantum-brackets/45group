import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import UsersService from "~/services/users";
import { notifyError } from "~/utils/toast";

export function useUpdateMe() {
  return useMutation({
    mutationFn: UsersService.updateMe,
    onError: (error) => {
      if (isAxiosError(error)) {
        return notifyError({ message: "Error occured while updating user" });
      }
    },
  });
}
