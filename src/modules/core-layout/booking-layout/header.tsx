"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FormControlLabel,
  MenuItem,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { FaChevronDown } from "react-icons/fa6";
import bookingsData from "~/data/bookings.json";
import SearchInput from "~/components/inputs/search-input";
import useDebounce from "~/hooks/debounce";
import { cn } from "~/utils/helpers";

const sortData = [
  {
    value: "featured",
    label: "Featured",
  },
  {
    value: "most-popular",
    label: "Most Popular",
  },
  {
    value: "price-desc",
    label: "Price: High to Low",
  },
  {
    value: "price-asc",
    label: "Price: Low to High",
  },
];

export default function Header() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", { ...params }],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          //? add debounce here
          resolve([] as Booking[]);
        }, 5000);
      });
    },
  });

  const sortBy = searchParams.get("sort") || "featured";

  function onClose() {
    setAnchorEl(null);
  }

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);

    if (value === "featured") {
      window.history.replaceState(null, "", pathname);
    } else {
      params.set("sort", value);
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
    onClose();
  }

  if (isLoading) {
    return (
      <div className="border-b-1.5 flex w-full items-center justify-between gap-8 p-2 px-8 tablet:px-4">
        <Skeleton variant="rounded" className="h-[20px] w-[100px]" />
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" className="!h-[40px] w-[300px]" />
          <Skeleton variant="rounded" className="!h-[40px] w-[180px]" />
        </div>
      </div>
    );
  }

  return (
    <header className="border-b-1.5 flex w-full items-center justify-between gap-8 border-zinc-300/60 p-2 px-8 tablet:px-4 [@media(max-width:500px)]:justify-start">
      <p className="text-nowrap text-sm text-zinc-500 tablet_768:text-xs [@media(max-width:500px)]:self-start">
        <span className="text-base tablet_768:text-sm">{bookings?.length || 0}</span> results
      </p>
      <div className="flex items-center gap-8 [@media(max-width:500px)]:w-full [@media(max-width:500px)]:flex-col [@media(max-width:500px)]:items-start">
        <div className="tablet_768:w-full [@media(max-width:500px)]:w-full [@media(max-width:500px)]:border-b">
          <SearchInput
            value={search || ""}
            className="!w-[350px] tablet_768:!w-full"
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value || "");

              const params = new URLSearchParams(searchParams.toString());
              params.set("q", value);

              window.history.replaceState(null, "", `/booking?${params.toString()}`);
            }}
          />
        </div>
        <div className="flex items-center gap-4 tablet_768:hidden">
          <p className="text-sm tablet_768:text-xs">Sort By:</p>
          <button className="flex items-center gap-2" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <p className="text-sm text-primary tablet_768:text-xs">
              {sortData.find((item) => item.value === sortBy)?.label}
            </p>
            <FaChevronDown
              className={cn("text-sm text-primary transition tablet_768:text-xs", {
                "rotate-180": open,
              })}
            />
          </button>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <div className="min-w-[200px] bg-white p-4">
              <RadioGroup
                value={sortBy}
                onChange={(e) => {
                  handleChange(e.target.value);
                }}
              >
                {sortData.map(({ value, label }, index) => (
                  <FormControlLabel
                    key={index + 1}
                    value={value}
                    control={<Radio />}
                    label={label}
                    slotProps={{
                      typography: {
                        className: "text-xs",
                      },
                    }}
                  />
                ))}
              </RadioGroup>
            </div>
          </Popover>
        </div>
      </div>
    </header>
  );
}
