import { axiosPrivate } from "~/config/axios";
import { Facility } from "~/db/schemas/facilities";

type FacilityPayload = {
  name: string;
  description?: string;
};

class FacilityService {
  static createFacility = async (data: FacilityPayload) => {
    const { data: response } = await axiosPrivate.post<Facility>(`/api/admin/facilities`, data);

    return response;
  };

  static getFacilities = async () => {
    const { data: response } = await axiosPrivate.get<Facility[]>(`/api/admin/facilities`);

    return response;
  };

  static deleteFacility = async (id: string) => {
    const { data: response } = await axiosPrivate.delete(`/api/admin/facilities/${id}`);

    return response;
  };

  static updateFacility = async ({ id, data }: { id: string; data: Partial<FacilityPayload> }) => {
    const { data: response } = await axiosPrivate.patch<Facility>(
      `/api/admin/facilities/${id}`,
      data
    );

    return response;
  };
}

export default FacilityService;
