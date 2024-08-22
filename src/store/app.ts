import { create } from "zustand";

type State = {};

type Action = {};

const useAppStore = create<State & Action>()((set) => ({}));

export default useAppStore;
