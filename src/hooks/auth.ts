import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import axiosInstance from "~/config/axios";
import AuthService from "~/services/auth";
import { notifyError } from "~/utils/toast";

export function useSignin() {
  return useMutation({
    mutationFn: AuthService.signin,
    onSuccess: (data) => {
      axiosInstance.defaults.headers.common["Authorization"] = "Bearer " + data.access_token;
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.status === 400) {
          notifyError({
            message: "Email already in use",
          });
        }
      }
    },
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: AuthService.requestOtp,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.status === 404) {
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
        if (error.status === 401) {
          return notifyError({ message: "Otp has expired or does not exist." });
        }
        if (error.status === 404) {
          return notifyError({ message: "OTP expired or does not exist" });
        }
      }
    },
  });
}
