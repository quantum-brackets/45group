"use client";

import { useRef } from "react";
import { Drawer, IconButton, MenuItem } from "@mui/material";
import { IoClose } from "react-icons/io5";
import SelectInput from "~/components/inputs/select-input";
import GroupFilter from "./group-filter";
import FromFilter from "./from-filter";
import ToFilter from "./to-filter";
import Button from "~/components/button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  type?: string;
  city?: string;
  group?: string;
  filterHandler: (searchTerm: string, key: string) => void;
};

export default function MobileFilter({ isOpen, onClose, filterHandler, city, type, group }: Props) {
  const groupFilterRef = useRef<{ triggerApplyFilter: () => void } | null>(null);

  const handleMobileApplyFilters = () => {
    groupFilterRef.current?.triggerApplyFilter();
    // onClose();
  };

  return (
    <Drawer anchor="bottom" open={isOpen} onClose={onClose}>
      <aside className="hidden w-full flex-col p-4 tablet:flex">
        <header className="flex w-full items-center justify-between gap-8">
          <h2 className="font-semibold">Filters</h2>
          <IconButton onClick={onClose}>
            <IoClose className="text-xl text-zinc-600" />
          </IconButton>
        </header>
      </aside>
      <main className="flex flex-col gap-8 px-4 pb-8">
        <div className="flex flex-col gap-4">
          <SelectInput
            label="Type"
            value={type || ""}
            onChange={(e) => {
              const value = e.target.value as string;
              if (value) {
                filterHandler(value, "type");
              }
            }}
          >
            <MenuItem value={"rooms"}>Rooms</MenuItem>
            <MenuItem value={"events"}>Events</MenuItem>
            <MenuItem value={"dining"}>Dining</MenuItem>
          </SelectInput>
          <SelectInput
            label="City"
            value={city || ""}
            onChange={(e) => {
              const value = e.target.value as string;
              if (value) {
                filterHandler(value, "city");
              }
            }}
          >
            <MenuItem value={"abuja"}>Abuja</MenuItem>
            <MenuItem value={"calabar"}>Calabar</MenuItem>
            <MenuItem value={"ikom"}>Ikom</MenuItem>
          </SelectInput>
          <GroupFilter ref={groupFilterRef} groupQuery={group} autoApply={false} />
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
