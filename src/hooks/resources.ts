import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import ResourcesService from "~/services/resources";
import { notifyError } from "~/utils/toast";

export function useCreateResourceRule() {
  return useMutation({
    mutationFn: ResourcesService.createResourceRule,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}

export function useCreateResourceGroup() {
  return useMutation({
    mutationFn: ResourcesService.createResourceGroup,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}

export function useCreateResourceFacility() {
  return useMutation({
    mutationFn: ResourcesService.createResourceFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}

export function useDeleteResourceRule() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceRule,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}

export function useDeleteResourceGroup() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceGroup,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}

export function useDeleteResourceFacility() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        const errorMsg = error.response?.data.error;
        if (errorMsg) {
          return notifyError({ message: errorMsg });
        }
        notifyError({ message: error.response?.data.errors?.[0]?.message });
      }
    },
  });
}
