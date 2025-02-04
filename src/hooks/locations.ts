import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import LocationsService from "~/services/locations";
import { notifyError } from "~/utils/toast";

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: LocationsService.deleteLocation,
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
      queryClient.invalidateQueries({ queryKey: ["locations"], exact: false });
    },
  });
}
