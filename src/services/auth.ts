import axiosInstance from "~/config/axios";

class AuthService {
  static signin = async (data: { email: string }) => {
    const { data: response } = await axiosInstance.post<any>(`/api/signin`, data);

    return response;
  };

  static requestOtp = async (data: Record<"email", string>) => {
    const { data: response } = await axiosInstance.post("/api/otp/send", data, {
      baseURL: process.env.NEXT_PUBLIC_OTP_BACKEND_URL,
    });

    return response;
  };

  static verifyOtp = async (data: Record<"email" | "otp", string>) => {
    const { data: response } = await axiosInstance.post<{ access_token: string }>(
      "/api/otp/verify",
      data
    );

    return response;
  };
}

export default AuthService;
