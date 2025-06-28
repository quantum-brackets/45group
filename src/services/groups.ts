import { axiosPrivate } from "~/config/axios";
import { Group } from "~/db/schemas/groups";

type GroupPayload = {
  name: string;
};

class GroupService {
  static createGroup = async (data: GroupPayload) => {
    const { data: response } = await axiosPrivate.post<Group>(`/api/admin/groups`, data);

    return response;
  };

  static getGroups = async () => {
    const { data: response } = await axiosPrivate.get<Group[]>(`/api/admin/groups`);

    return response;
  };

  static deleteGroup = async (id: string) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/groups/${id}`);

    return response;
  };

  static updateGroup = async ({ id, data }: { id: string; data: GroupPayload }) => {
    const { data: response } = await axiosPrivate.patch<Group>(`/api/admin/groups/${id}`, data);

    return response;
  };
}

export default GroupService;
