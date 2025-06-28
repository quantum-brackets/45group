import axiosInstance, { axiosPrivate } from "~/config/axios";

class AuthService {
  static signin = async (data: { email: string }) => {
    const { data: response } = await axiosInstance.post<any>(`/api/auth/signin`, data);

    return response;
  };

  static requestOtp = async (data: Record<"email", string>) => {
    const { data: response } = await axiosInstance.post("/api/auth/otp/request", data);

    return response;
  };

  static verifyOtp = async (data: Record<"email" | "otp", string>) => {
    const { data: response } = await axiosInstance.post("/api/auth/otp/verify", data);

    return response;
  };

  static createJwt = async (data: Record<"email", string>) => {
    const { data: response } = await axiosInstance.post<Record<"access" | "refresh", string>>(
      "/api/auth/jwt/create",
      data
    );

    return response;
  };

  static refreshJwt = async (data: Record<"refresh", string>) => {
    const { data: response } = await axiosInstance.post<Record<"access" | "refresh", string>>(
      "/api/auth/jwt/refresh",
      data
    );

    return response;
  };

  static createSession = async (data: Record<"email", string>) => {
    const { data: response } = await axiosInstance.post<any>("/api/auth/session/create", data);

    return response;
  };

  static changeEmail = async (data: Record<"new_email", string>) => {
    const { data: response } = await axiosPrivate.post<any>("/api/auth/set-email", data);

    return response;
  };

  static logout = async () => {
    const { data: response } = await axiosInstance.post<any>("/api/auth/logout");

    return response;
  };
}

export default AuthService;
