"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";

export default function CityFilter() {
  const searchParams = useSearchParams();

  const city = searchParams.get("city") || "";

  const handleValue = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("city", value);
      window.history.replaceState(null, "", `/booking?${params.toString()}`);
    },
    [searchParams]
  );

  return (
    <SelectInput
      label="City"
      value={city}
      onChange={(e) => {
        const value = e.target.value as string;
        handleValue(value);
      }}
    >
      <MenuItem value={"abuja"}>Abuja</MenuItem>
      <MenuItem value={"calabar"}>Calabar</MenuItem>
      <MenuItem value={"ikom"}>Ikom</MenuItem>
    </SelectInput>
  );
}
