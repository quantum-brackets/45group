"use client";

import { useRef } from "react";
import { Drawer, IconButton } from "@mui/material";
import { IoClose } from "react-icons/io5";
import GroupFilter from "./group-filter";
import FromFilter from "./from-filter";
import ToFilter from "./to-filter";
import Button from "~/components/button";
import CityFilter from "./city-filter";
import TypeFilter from "./type-filter";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileFilter({ isOpen, onClose }: Props) {
  const groupFilterRef = useRef<{ triggerApplyFilter: () => void } | null>(null);

  const handleMobileApplyFilters = () => {
    groupFilterRef.current?.triggerApplyFilter();
    onClose();
  };

  return (
    <Drawer className="hidden tablet:block" anchor="bottom" open={isOpen} onClose={onClose}>
      <aside className="flex w-full flex-col p-4">
        <header className="flex w-full items-center justify-between gap-8">
          <h2 className="font-semibold">Filters</h2>
          <IconButton onClick={onClose}>
            <IoClose className="text-xl text-zinc-600" />
          </IconButton>
        </header>
      </aside>
      <main className="flex flex-col gap-8 px-4 pb-8">
        <div className="flex flex-col gap-4">
          <TypeFilter />
          <CityFilter />
          <GroupFilter ref={groupFilterRef} autoApply={false} />
          <FromFilter />
          <ToFilter />
        </div>
        <Button className="!w-fit self-end" onClick={handleMobileApplyFilters}>
          Apply Filters
        </Button>
      </main>
    </Drawer>
  );
}
