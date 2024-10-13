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
    const { data: response } = await axiosInstance.post<{ access_token: string }>(
      "/api/auth/otp/verify",
      data
    );

    return response;
  };
}

export default AuthService;
