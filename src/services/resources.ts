import { axiosPrivate } from "~/config/axios";
import { ResourceGroup } from "~/db/schemas/groups";

class ResourcesService {
  static createResource = async (data: any) => {
    const { data: response } = await axiosPrivate.postForm<Resource>(`/api/admin/resources`, data);

    return response;
  };

  static getResources = async <T>({ params }: { params?: URLSearchParams } = {}) => {
    const queryString = params ? `?${params.toString()}` : "";
    const { data: response } = await axiosPrivate.get<
      T extends Resource[] ? T : Pagination<Resource>
    >(`/api/admin/resources${queryString}`);

    return response;
  };

  static getResourceRules = async () => {
    const { data: response } = await axiosPrivate.get<ResourceRule[]>(`/api/admin/rules`);

    return response;
  };

  static createResourceRule = async (
    data: Pick<ResourceRule, "name" | "description" | "category">
  ) => {
    const { data: response } = await axiosPrivate.post<ResourceRule>(`/api/admin/rules`, data);

    return response;
  };

  static deleteResourceRule = async (id: string) => {
    const { data: response } = await axiosPrivate.delete<any>(`/api/admin/rules/${id}`);

    return response;
  };

  static getResourceFacilities = async () => {
    const { data: response } = await axiosPrivate.get<ResourceFacility[]>(`/api/admin/facilities`);

    return response;
  };

  static createResourceFacility = async (data: Pick<ResourceFacility, "name" | "description">) => {
    const { data: response } = await axiosPrivate.post<ResourceFacility>(
      `/api/admin/facilities`,
      data
    );

    return response;
  };

  static deleteResourceFacility = async (id: string) => {
    const { data: response } = await axiosPrivate.get<any>(`/api/admin/facilities/${id}`);

    return response;
  };

  static getResourceGroups = async () => {
    const { data: response } = await axiosPrivate.get<ResourceGroup[]>(`/api/admin/groups`);

    return response;
  };
}

export default ResourcesService;
