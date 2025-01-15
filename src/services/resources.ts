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

  static getResourceFacilities = async () => {
    const { data: response } = await axiosPrivate.get<ResourceRule[]>(`/api/admin/facilities`);

    return response;
  };

  static getResourceGroups = async () => {
    const { data: response } = await axiosPrivate.get<ResourceGroup[]>(`/api/admin/groups`);

    return response;
  };
}

export default ResourcesService;
