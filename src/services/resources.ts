import { axiosPrivate } from "~/config/axios";

class ResourcesService {
  static createResource = async (data: any) => {
    const { data: response } = await axiosPrivate.postForm<Resource>(`/api/resources`, data);

    return response;
  };

  static getResources = async () => {
    const { data: response } = await axiosPrivate.get<Resource>(`/api/resources`);

    return response;
  };

  static getResourceRules = async () => {
    const { data: response } = await axiosPrivate.get<ResourceRule[]>(`/api/resources/rules`);

    return response;
  };

  static getResourceFacilities = async () => {
    const { data: response } = await axiosPrivate.get<ResourceRule[]>(`/api/resources/facilities`);

    return response;
  };
}

export default ResourcesService;
