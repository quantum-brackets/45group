import { axiosPrivate } from "~/config/axios";
import { Location } from "~/db/schemas/locations";

class LocationsService {
  static createLocation = async (data: any) => {
    const { data: response } = await axiosPrivate.postForm<Location>(`/api/locations`, data);

    return response;
  };

  static getLocations = async () => {
    const { data: response } = await axiosPrivate.get<Location[]>(`/api/locations`);

    return response;
  };
}

export default LocationsService;
