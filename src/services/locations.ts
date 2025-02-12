import { axiosPrivate } from "~/config/axios";
import { Location } from "~/db/schemas/locations";

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
    const { data: response } = await axiosPrivate.post<Location>(
      `/api/admin/locations/${id}`,
      data
    );

    return response;
  };
}

export default LocationsService;
