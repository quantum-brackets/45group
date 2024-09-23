import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CURRENCY_CODE } from "~/utils/constants";

type State = {
  currency: string;
};

type Action = {
  changeCurrency: (value: string) => void;
};

const useAppStore = create<State & Action>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY_CODE,
      changeCurrency: (currency) => set({ currency }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
      }),
    }
  )
);

export default useAppStore;
