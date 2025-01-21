import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import ResourcesService from "~/services/resources";
import { notifyError } from "~/utils/toast";

export function useCreateResourceRule() {
  return useMutation({
    mutationFn: ResourcesService.createResourceRule,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useCreateResourceGroup() {
  return useMutation({
    mutationFn: ResourcesService.createResourceGroup,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useCreateResourceFacility() {
  return useMutation({
    mutationFn: ResourcesService.createResourceFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useDeleteResourceRule() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceRule,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useDeleteResourceGroup() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceGroup,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}

export function useDeleteResourceFacility() {
  return useMutation({
    mutationFn: ResourcesService.deleteResourceFacility,
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });
}
