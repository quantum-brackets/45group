import { axiosPrivate } from "~/config/axios";

class UsersService {
  static updateMe = async (data: any) => {
    const { data: response } = await axiosPrivate.post<User>(`/api/users/me`, data);

    return response;
  };

  static getMe = async () => {
    const { data: response } = await axiosPrivate.get<User>(`/api/users/me`);

    return response;
  };
}

export default UsersService;
