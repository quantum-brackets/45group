import axiosInstance from "~/config/axios";

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

  static refreshJwt = async (data: Record<"email", string>) => {
    const { data: response } = await axiosInstance.post<Record<"refresh", string>>(
      "/api/auth/jwt/refresh",
      data
    );

    return response;
  };
}

export default AuthService;
