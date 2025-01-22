import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import ResourcesService from "~/services/resources";
import { notifyError } from "~/utils/toast";

export function useCreateResource() {
  return useMutation({
    mutationFn: ResourcesService.createResource,
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
  });
}

export function useUpdateResource() {
  return useMutation({
    mutationFn: ResourcesService.updateResource,
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
  });
}

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
