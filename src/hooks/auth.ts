import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { setCookie } from "~/app/_actions/util";
import { axiosPrivate } from "~/config/axios";
import AuthService from "~/services/auth";
import { JWT_KEY } from "~/utils/constants";
import { notifyError } from "~/utils/toast";

export function useSignin() {
  return useMutation({
    mutationFn: AuthService.signin,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: AuthService.requestOtp,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.status === 400) {
          notifyError({
            message: "User with this email doesn't exist",
          });
        }
      }
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: AuthService.verifyOtp,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.status === 400) {
          return notifyError({ message: "Otp has expired or does not exist." });
        }
        if (error.status === 404) {
          return notifyError({ message: "OTP expired or does not exist" });
        }
      }
    },
  });
}

export function useCreateJwt() {
  return useMutation({
    mutationFn: AuthService.createJwt,
    onSuccess: async (data) => {
      axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + data.access;
      await setCookie(JWT_KEY, data.refresh);
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: AuthService.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["current-user"],
      });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: AuthService.logout,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: "Error occured while logging out" });
      }
    },
  });
}
