"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";

export default function Filters() {
  const searchParams = useSearchParams();

  const params: BookingSearchParams = ["type", "city", "group", "from", "to"].reduce(
    (acc, param) => {
      acc[param as keyof BookingSearchParams] = searchParams.get(param) || undefined;
      return acc;
    },
    {} as BookingSearchParams
  );

  const { type, city, group, from, to } = params;

  const filterHandler = useCallback(
    (searchTerm: string) => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("q", searchTerm);
      } else {
        params.delete("q");
      }

      window.history.replaceState(null, "", `/booking?${params.toString()}`);
    },
    [searchParams]
  );

  return (
    <aside className="flex flex-grow flex-col gap-4 border-r-1.5 border-zinc-300/60 p-4 pt-8 tablet:border-b tablet:pt-4 largeTabletAndBelow:w-[250px]">
      <h2>Filters:</h2>
      <div className="flex w-[300px] flex-col gap-6 tablet:!w-full tablet:flex-row tablet:overflow-x-auto">
        <SelectInput
          label="Type"
          value={type || ""}
          className="tablet:!w-[150px]"
          onChange={(e) => {
            const value = e.target.value as string;
            console.log(value);

            if (value) {
              filterHandler(value);
            }
          }}
        >
          <MenuItem value={"rooms"}>Rooms</MenuItem>
          <MenuItem value={"events"}>Events</MenuItem>
          <MenuItem value={"dining"}>Dining</MenuItem>
        </SelectInput>
        <SelectInput label="City" className="tablet:!w-[150px]">
          <MenuItem value={"abuja"}>Abuja</MenuItem>
          <MenuItem value={"calabar"}>Calabar</MenuItem>
          <MenuItem value={"ikom"}>Ikom</MenuItem>
        </SelectInput>
        <SelectInput label="Group" className="tablet:!w-[150px]">
          <MenuItem value={"rooms"}>Rooms</MenuItem>
          <MenuItem value={"events"}>Events</MenuItem>
          <MenuItem value={"dining"}>Dining</MenuItem>
        </SelectInput>
      </div>
    </aside>
  );
}