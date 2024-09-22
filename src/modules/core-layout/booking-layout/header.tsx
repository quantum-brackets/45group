"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem, Select, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import bookingsData from "~/data/bookings.json";
import SearchInput from "~/components/inputs/search-input";
import useDebounce from "~/hooks/debounce";

export default function Header() {
  const searchParams = useSearchParams();

  const params: BookingSearchParams = [
    "type",
    "city",
    "group",
    "from",
    "to",
    "sort_by",
    "q",
  ].reduce((acc, param) => {
    acc[param as keyof BookingSearchParams] = searchParams.get(param) || undefined;
    return acc;
  }, {} as BookingSearchParams);

  const { type, city, group, from, to, sort_by, q } = params;

  const [search, setSearch] = useState(q || "");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", { type, city, group, from, to, sort_by, q }],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          //? add debounce here
          resolve([] as Booking[]);
        }, 5000);
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-between gap-8 border-b p-2 px-8 tablet:px-4">
        <Skeleton variant="rounded" className="h-[20px] w-[100px]" />
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" className="!h-[40px] w-[180px]" />
          <Skeleton variant="rounded" className="!h-[40px] w-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <header className="flex items-center justify-between gap-8 border-b-1.5 border-zinc-300/60 p-2 px-8 tablet:px-4 [@media(max-width:500px)]:justify-start">
      <p className="text-nowrap text-sm text-zinc-500 [@media(max-width:500px)]:self-start">
        <span className="text-base">{bookings?.length || 0}</span> results
      </p>
      <div className="flex items-center gap-4 [@media(max-width:500px)]:w-full [@media(max-width:500px)]:flex-col [@media(max-width:500px)]:items-start">
        <Select
          value={sort_by || ""}
          className="!w-[200px]"
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              const params = new URLSearchParams(searchParams.toString());
              params.set("sort-by", value);

              window.history.replaceState(null, "", `/booking?${params.toString()}`);
            }
          }}
          placeholder="Sort By"
        >
          <MenuItem value={"featured"}>Featured</MenuItem>
          <MenuItem value={"most-popular"}>Most Popular</MenuItem>
          <MenuItem value={"price-desc"}>Price: High to Low</MenuItem>
          <MenuItem value={"price-asc"}>Price: Low to High</MenuItem>
        </Select>
        <div className="[@media(max-width:500px)]:w-full [@media(max-width:500px)]:border-b">
          <SearchInput
            value={search || ""}
            className="!w-[350px] tablet:!w-full"
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value || "");

              const params = new URLSearchParams(searchParams.toString());
              params.set("q", value);

              window.history.replaceState(null, "", `/booking?${params.toString()}`);
            }}
          />
        </div>
      </div>
    </header>
  );
}
