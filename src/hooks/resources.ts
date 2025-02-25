import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Resource } from "~/db/schemas/resources";
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
    onMutate: async ({ id, data: { thumbnail, ...data } }) => {
      await queryClient.cancelQueries({ queryKey: ["resources"] });

      const previousResource = queryClient.getQueryData<Resource>(["resources", id]);

      queryClient.setQueryData<Resource>(["resources", id], (old) => {
        if (!old) return old;

        return {
          ...old,
          ...data,
          status: data.status ?? old.status,
        } as Resource;
      });

      return { previousResource };
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

export function useUploadResourceMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.uploadMedia,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useDeleteResourceMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.deleteMedia,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useAddResourceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.addRule,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useDeleteResourceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.deleteRule,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useAddResourceFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.addFacility,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useDeleteResourceFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.deleteFacility,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useAddResourceGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.addGroup,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}

export function useDeleteResourceGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ResourceService.deleteGroup,
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
      queryClient.invalidateQueries({ queryKey: ["resources"], exact: false });
    },
  });
}
