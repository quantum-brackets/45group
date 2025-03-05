import { axiosPrivate } from "~/config/axios";
import { Media } from "~/db/schemas/media";
import { Resource } from "~/db/schemas/resources";

type ResourcePayload = Omit<
  Resource,
  "id" | "updated_at" | "created_at" | "thumbnail" | "schedules" | "location" | "status" | "handle"
> & {
  thumbnail: File;
  status?: Resource["status"];
  schedules: Record<"start_time" | "end_time" | "day_of_week", string>[];
};

class ResourceService {
  static createResource = async (data: ResourcePayload) => {
    const { data: response } = await axiosPrivate.postForm<Resource>(`/api/admin/resources`, data);

    return response;
  };

  static updateResource = async ({ id, data }: { id: string; data: Partial<ResourcePayload> }) => {
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

  static uploadMedia = async ({ id, data }: { id: string; data: { medias: File[] } }) => {
    const { data: response } = await axiosPrivate.postForm<Media>(
      `/api/admin/resources/${id}/media`,
      data
    );

    return response;
  };

  static deleteMedia = async ({ id, data }: { id: string; data: { media_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.delete<Media>(
      `/api/admin/resources/${id}/media`,
      {
        data,
      }
    );

    return response;
  };

  static removeRule = async ({ id, data }: { id: string; data: { rule_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/resources/${id}/rule`, {
      data,
    });

    return response;
  };

  static addRule = async ({ id, data }: { id: string; data: { rule_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.post(`/api/admin/resources/${id}/rule`, data);

    return response;
  };

  static deleteFacility = async ({
    id,
    data,
  }: {
    id: string;
    data: { facility_ids: string[] };
  }) => {
    const { data: response } = await axiosPrivate.delete<Media>(
      `/api/admin/resources/${id}/facility`,
      {
        data,
      }
    );

    return response;
  };

  static addFacility = async ({ id, data }: { id: string; data: { facility_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.post<Media>(
      `/api/admin/resources/${id}/facility`,
      data
    );

    return response;
  };

  static deleteGroup = async ({ id, data }: { id: string; data: { group_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.delete<Media>(
      `/api/admin/resources/${id}/group`,
      {
        data,
      }
    );

    return response;
  };

  static addGroup = async ({
    id,
    data,
  }: {
    id: string;
    data: { group_ids: { id: string; num: number }[] };
  }) => {
    const { data: response } = await axiosPrivate.post<Media>(
      `/api/admin/resources/${id}/group`,
      data
    );

    return response;
  };
}

export default ResourceService;
