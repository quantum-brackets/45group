"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";
import GroupFilter from "./group-filter";
import FromFilter from "./from-filter";
import ToFilter from "./to-filter";
import MobileFilter from "./mobile-filter";
import CityFilter from "./city-filter";
import TypeFilter from "./type-filter";

type Props = {
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
};

export default function Filters({ isMobileDrawerOpen, onCloseMobileDrawer }: Props) {
  const searchParams = useSearchParams();

  const group = searchParams.get("group") || "";

  return (
    <>
      <aside className="flex w-[300px] flex-grow flex-col gap-6 border-r-1.5 border-zinc-300/60 p-4 pb-12 pt-8 tablet:hidden tablet:border-b tablet:pt-4 largeTabletAndBelow:w-[250px]">
        <h2 className="font-semibold text-black/80">Filters:</h2>
        <div className="flex flex-col gap-4 tablet:!w-full tablet:flex-row tablet:overflow-x-auto">
          <TypeFilter />
          <CityFilter />
          <GroupFilter groupQuery={group} />
          <FromFilter />
          <ToFilter />
        </div>
      </aside>
      <MobileFilter isOpen={isMobileDrawerOpen} onClose={onCloseMobileDrawer} group={group} />
    </>
  );
}
