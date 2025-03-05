import { axiosPrivate } from "~/config/axios";
import { Location } from "~/db/schemas/locations";
import { Media } from "~/db/schemas/media";

class LocationsService {
  static createLocation = async (data: any) => {
    const { data: response } = await axiosPrivate.postForm<Location>(`/api/admin/locations`, data);

    return response;
  };

  static getLocations = async <T>({ params }: { params?: URLSearchParams } = {}) => {
    const queryString = params ? `?${params.toString()}` : "";

    const { data: response } = await axiosPrivate.get<
      T extends Location[] ? T : Pagination<Location>
    >(`/api/admin/locations${queryString}`);

    return response;
  };

  static deleteLocation = async (id: string) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/locations/${id}`);

    return response;
  };

  static getLocation = async (id: string) => {
    const { data: response } = await axiosPrivate.get<Location>(`/api/admin/locations/${id}`);

    return response;
  };

  static updateLocation = async ({ id, data }: { id: string; data: any }) => {
    const { data: response } = await axiosPrivate.patch<Location>(
      `/api/admin/locations/${id}`,
      data
    );

    return response;
  };

  static uploadMedia = async ({
    id,
    data,
  }: {
    id: string;
    data: { name: string; state: string; city: string; medias: File[] };
  }) => {
    const { data: response } = await axiosPrivate.postForm<Media>(
      `/api/admin/locations/${id}/media`,
      data
    );

    return response;
  };

  static deleteMedia = async ({ id, data }: { id: string; data: { media_ids: string[] } }) => {
    const { data: response } = await axiosPrivate.delete<Media>(
      `/api/admin/locations/${id}/media`,
      {
        data,
      }
    );

    return response;
  };
}

export default LocationsService;
