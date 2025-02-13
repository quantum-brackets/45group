import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import RuleService from "~/services/rules";
import { notifyError } from "~/utils/toast";

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: RuleService.createRule,
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
      queryClient.invalidateQueries({ queryKey: ["rules"], exact: false });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: RuleService.updateRule,
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
      queryClient.invalidateQueries({ queryKey: ["rules"], exact: false });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: RuleService.deleteRule,
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
      queryClient.invalidateQueries({ queryKey: ["rules"], exact: false });
    },
  });
}
