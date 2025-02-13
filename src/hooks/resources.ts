import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import ResourceService from "~/services/resources";
import { notifyError } from "~/utils/toast";

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.createResource,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.data.error) {
          return notifyError({ message: error.response?.data.error });
        }
        if (error.response?.data.errors?.[0]?.message) {
          return notifyError({ message: error.response?.data.errors?.[0]?.message });
        }
        notifyError({ message: "Error occured while creating resource" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.updateResource,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.data.error) {
          return notifyError({ message: error.response?.data.error });
        }
        if (error.response?.data.errors?.[0]?.message) {
          return notifyError({ message: error.response?.data.errors?.[0]?.message });
        }
        notifyError({ message: "Error occured while updating resource" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.deleteResource,
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.data.error) {
          return notifyError({ message: error.response?.data.error });
        }
        if (error.response?.data.errors?.[0]?.message) {
          return notifyError({ message: error.response?.data.errors?.[0]?.message });
        }
        notifyError({ message: "Error occured while deleting resource" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}
