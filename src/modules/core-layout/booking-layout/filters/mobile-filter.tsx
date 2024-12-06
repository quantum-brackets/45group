"use client";

import { useCallback, useRef } from "react";
import { Drawer, IconButton } from "@mui/material";
import { IoClose } from "react-icons/io5";
import { Dayjs } from "dayjs";
import GroupFilter from "./group-filter";
import FromFilter from "./from-filter";
import ToFilter from "./to-filter";
import Button from "~/components/button";
import CityFilter from "./city-filter";
import TypeFilter from "./type-filter";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dates: {
    startDate: string | null;
    endDate: string | null;
  };
  createFilterProps: (key: "type" | "city" | "startDate" | "endDate") => {
    value: string;
    updateValue: (value: string) => void;
    updateSearchParams: () => void;
  };
};

export default function MobileFilter({ isOpen, onClose, dates, createFilterProps }: Props) {
  const groupFilterRef = useRef<{ applyGroup: () => void } | null>(null);

  const handleMobileApplyFilters = useCallback(() => {
    const filterKeys = ["type", "city", "startDate", "endDate"] as const;
    filterKeys.forEach((key) => {
      const filterProps = createFilterProps(key);
      filterProps.updateSearchParams();
    });
    groupFilterRef.current?.applyGroup();
    onClose();
  }, [createFilterProps, onClose]);

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
          <TypeFilter {...createFilterProps("type")} autoApply={false} />
          <CityFilter {...createFilterProps("city")} autoApply={false} />
          <GroupFilter ref={groupFilterRef} autoApply={false} />
          <FromFilter autoApply={false} dates={dates} {...createFilterProps("startDate")} />
          <ToFilter autoApply={false} dates={dates} {...createFilterProps("endDate")} />
        </div>
        <Button className="!w-fit self-end" onClick={handleMobileApplyFilters}>
          Apply Filters
        </Button>
      </main>
    </Drawer>
  );
}
