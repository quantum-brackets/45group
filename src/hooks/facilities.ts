import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import FacilityService from "~/services/facilities";
import { notifyError } from "~/utils/toast";

export function useCreateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FacilityService.createFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"], exact: false });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FacilityService.updateFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"], exact: false });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FacilityService.deleteFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"], exact: false });
    },
  });
}
