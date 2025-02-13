import { axiosPrivate } from "~/config/axios";
import { Resource } from "~/db/schemas/resources";

class ResourceService {
  static createResource = async (data: any) => {
    const { data: response } = await axiosPrivate.postForm<Resource>(`/api/admin/resources`, data);

    return response;
  };

  static updateResource = async ({ id, data }: { id: string; data: any }) => {
    const { data: response } = await axiosPrivate.patchForm<Resource>(
      `/api/admin/resources/${id}`,
      data
    );

    return response;
  };

  static deleteResource = async (id: string) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/resources/${id}`);

    return response;
  };

  static getResources = async <T>({ params }: { params?: URLSearchParams } = {}) => {
    const queryString = params ? `?${params.toString()}` : "";
    const { data: response } = await axiosPrivate.get<
      T extends Resource[] ? T : Pagination<Resource>
    >(`/api/admin/resources${queryString}`);

    return response;
  };

  static getResource = async (id: string) => {
    const { data: response } = await axiosPrivate.get<Resource>(`/api/admin/resources/${id}`);

    return response;
  };
}

export default ResourceService;
