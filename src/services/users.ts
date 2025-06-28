import { axiosPrivate } from "~/config/axios";

type UserReq = Omit<Partial<User>, "email" | "image"> & {
  image?: File | string;
};

class UsersService {
  static updateMe = async (data: UserReq) => {
    const { data: response } = await axiosPrivate.patchForm<User>(`/api/users/me`, data);

    return response;
  };

  static getMe = async () => {
    const { data: response } = await axiosPrivate.get<User>(`/api/users/me`);

    return response;
  };
}

export default UsersService;
