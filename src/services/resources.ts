import { axiosPrivate } from "~/config/axios";
import { ResourceFacility } from "~/db/schemas/facilities";
import { ResourceGroup } from "~/db/schemas/groups";
import { ResourceRule } from "~/db/schemas/rules";

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

  static createResourceRule = async (
    data: { name: string; description?: string } & Pick<ResourceRule, "category">
  ) => {
    const { data: response } = await axiosPrivate.post<ResourceRule>(`/api/admin/rules`, data);

    return response;
  };

  static createResourceFacility = async (data: { name: string; description?: string }) => {
    const { data: response } = await axiosPrivate.post<ResourceFacility>(
      `/api/admin/facilities`,
      data
    );

    return response;
  };

  static createResourceGroup = async (data: { name: string }) => {
    const { data: response } = await axiosPrivate.post<ResourceGroup>(`/api/admin/groups`, data);

    return response;
  };

  static getResourceRules = async () => {
    const { data: response } = await axiosPrivate.get<ResourceRule[]>(`/api/admin/rules`);

    return response;
  };

  static getResourceFacilities = async () => {
    const { data: response } = await axiosPrivate.get<ResourceFacility[]>(`/api/admin/facilities`);

    return response;
  };

  static getResourceGroups = async () => {
    const { data: response } = await axiosPrivate.get<ResourceGroup[]>(`/api/admin/groups`);

    return response;
  };

  static deleteResourceFacility = async (id: string) => {
    const { data: response } = await axiosPrivate.get<any>(`/api/admin/facilities/${id}`);

    return response;
  };

  static deleteResourceRule = async (id: string) => {
    const { data: response } = await axiosPrivate.delete<any>(`/api/admin/rules/${id}`);

    return response;
  };

  static deleteResourceGroup = async (id: string) => {
    const { data: response } = await axiosPrivate.delete<any>(`/api/admin/groups/${id}`);

    return response;
  };
}

export default ResourcesService;
