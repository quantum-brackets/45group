"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";

export default function TypeFilter() {
  const searchParams = useSearchParams();

  const type = searchParams.get("type") || "";

  const handleValue = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", value);
      window.history.replaceState(null, "", `/booking?${params.toString()}`);
    },
    [searchParams]
  );

  return (
    <SelectInput
      label="Type"
      value={type}
      onChange={(e) => {
        const value = e.target.value as string;
        handleValue(value);
      }}
    >
      <MenuItem value={"rooms"}>Rooms</MenuItem>
      <MenuItem value={"events"}>Events</MenuItem>
      <MenuItem value={"dining"}>Dining</MenuItem>
    </SelectInput>
  );
}
