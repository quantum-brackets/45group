import { axiosPrivate } from "~/config/axios";

class UsersService {
  static updateMe = async (data: any) => {
    const { data: response } = await axiosPrivate.post<any>(`/api/users/me`, data);

    return response;
  };
}

export default UsersService;
