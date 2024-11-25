"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { debounce, FormControlLabel, Popover, Radio, RadioGroup } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { FaChevronDown } from "react-icons/fa6";
import { FiFilter } from "react-icons/fi";
import bookingsData from "~/data/bookings.json";
import SearchInput from "~/components/inputs/search-input";
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

type Props = {
  openMobileDrawer: () => void;
};

export default function Header({ openMobileDrawer }: Props) {
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

  const { q, sort_by } = params;

  const [search, setSearch] = useState(q || "");
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const { data: bookings } = useQuery<Booking[]>({
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

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", value);
        window.history.replaceState(null, "", `/booking?${params.toString()}`);
      }, 300),
    [searchParams]
  );

  useEffect(() => {
    debouncedSetSearch(search);
    return () => {
      debouncedSetSearch.clear();
    };
  }, [search, debouncedSetSearch]);

  function onClose() {
    setAnchorEl(null);
  }

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);

    if (value === "featured") {
      params.delete("sort_by");
    } else {
      params.set("sort_by", value);
    }
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    onClose();
  }

  return (
    <header className="flex w-full items-center justify-between gap-8 border-b-1.5 border-zinc-300/60 p-2 px-4 [@media(max-width:500px)]:justify-start">
      <p className="text-nowrap text-sm text-zinc-500 tablet_768:text-xs [@media(max-width:500px)]:self-start">
        <span className="text-base tablet_768:text-sm">{bookings?.length || 0}</span> results
      </p>
      <div className="flex items-center gap-8 [@media(max-width:500px)]:w-full [@media(max-width:500px)]:flex-col [@media(max-width:500px)]:items-start">
        <div className="tablet_768:w-full [@media(max-width:500px)]:w-full [@media(max-width:500px)]:border-b">
          <div className="w-[350px] largeTabletAndBelow:w-[300px]">
            <SearchInput
              value={search || ""}
              className="!w-full"
              onChange={(e) => {
                setSearch(e.target.value || "");
              }}
            />
          </div>
        </div>
        <button
          className="hidden items-center gap-2 text-xs tablet:flex"
          onClick={openMobileDrawer}
        >
          <FiFilter />
          <span>Filter</span>
        </button>
        <div className="flex items-center gap-2 largeLaptop:gap-4">
          <p className="text-xs largeLaptop:text-sm">Sort By:</p>
          <button className="flex items-center gap-2" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <p className="whitespace-nowrap text-xs text-primary largeLaptop:text-sm">
              {sortData.find((item) => item.value === sort_by)?.label || "Featured"}
            </p>
            <FaChevronDown
              className={cn("text-xs text-primary largeLaptop:text-sm", {
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
            <div className="min-w-[200px] bg-white p-2">
              <RadioGroup
                value={sort_by || "featured"}
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
