"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dayjs } from "dayjs";
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

  const [filters, setFilters] = useState<{
    type: string;
    city: string;
    startDate: string;
    endDate: string;
  }>({
    type: "",
    city: "",
    startDate: "",
    endDate: "",
  });

  const dates = useMemo(
    () => ({ endDate: filters.endDate, startDate: filters.startDate }),
    [filters.endDate, filters.startDate]
  );

  useEffect(() => {
    const type = searchParams.get("type") || "";
    const city = searchParams.get("city") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    setFilters({
      type,
      city,
      startDate,
      endDate,
    });
  }, [searchParams]);

  const updateSearchParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    window.history.replaceState(null, "", `/booking?${params.toString()}`);
  }, []);

  const updateFilters = useCallback((key: keyof typeof filters, date: Dayjs | string) => {
    setFilters((prev) => ({ ...prev, [key]: date }));
  }, []);

  const createFilterProps = useCallback(
    (key: keyof typeof filters) => ({
      value: filters[key] as string,
      updateValue: (value: string) => updateFilters(key, value),
      updateSearchParams: (value: string) => {
        console.log(value);
        updateSearchParams(key, value);
      },
    }),
    [filters, updateFilters, updateSearchParams]
  );

  return (
    <>
      <aside className="flex w-[300px] flex-grow flex-col gap-6 border-r-1.5 border-zinc-300/60 p-4 pb-12 pt-8 tablet:hidden tablet:border-b tablet:pt-4 largeTabletAndBelow:w-[250px]">
        <h2 className="font-semibold text-black/80">Filters:</h2>
        <div className="flex flex-col gap-4 tablet:!w-full tablet:flex-row tablet:overflow-x-auto">
          <TypeFilter {...createFilterProps("type")} />
          <CityFilter {...createFilterProps("city")} />
          <GroupFilter />
          <FromFilter dates={dates} {...createFilterProps("startDate")} />
          <ToFilter dates={dates} {...createFilterProps("endDate")} />
        </div>
      </aside>
      {isMobileDrawerOpen && (
        <MobileFilter
          isOpen={isMobileDrawerOpen}
          onClose={onCloseMobileDrawer}
          dates={dates}
          filters={filters}
          createFilterProps={createFilterProps}
        />
      )}
    </>
  );
}
