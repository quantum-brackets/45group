"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClickAwayListener,
  debounce,
  Fade,
  MenuItem,
  OutlinedInput,
  Paper,
  Popper,
} from "@mui/material";
import { FaPlus, FaMinus } from "react-icons/fa6";
import SelectInput from "~/components/inputs/select-input";
import Button from "~/components/button";

const groupFilters = ["adults", "children", "seniors"];

export default function Filters() {
  const searchParams = useSearchParams();

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);

  const params: BookingSearchParams = ["type", "city", "group", "from", "to"].reduce(
    (acc, param) => {
      acc[param as keyof BookingSearchParams] = searchParams.get(param) || undefined;
      return acc;
    },
    {} as BookingSearchParams
  );

  const { type, city, group: groupQuery, from, to } = params;

  const [groupState, setGroupState] = useState(() => {
    const initialGroupState = groupFilters.reduce(
      (acc, filter) => {
        acc[filter as keyof typeof groupState] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    if (groupQuery) {
      groupQuery.split(",").forEach((filter) => {
        const [val, key] = filter.split("-");
        initialGroupState[key as keyof typeof initialGroupState] = Number(val);
      });
    }

    return initialGroupState;
  });

  const debouncedSetGroup = useMemo(
    () =>
      debounce((group: typeof groupState) => {
        let values = {} as typeof groupState;
        for (const _str of groupFilters) {
          const str = _str as keyof typeof group;
          values[str] = group[str] || 0;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set("group", `${Object.entries(values).map(([key, val]) => `${val}-${key}`)}`);
        window.history.replaceState(null, "", `/booking?${params.toString()}`);
      }, 500),
    [searchParams]
  );

  useEffect(() => {
    debouncedSetGroup(groupState);
    return () => {
      debouncedSetGroup.clear();
    };
  }, [debouncedSetGroup, groupState]);

  const filterHandler = useCallback(
    (searchTerm: string, key: string) => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set(key, searchTerm);
      } else {
        params.delete(key);
      }

      window.history.replaceState(null, "", `/booking?${params.toString()}`);
    },
    [searchParams]
  );

  function onClose() {
    setAnchorEl(null);
  }

  const group = useMemo(() => {
    let stateValue = 0;
    for (const str of groupFilters) {
      stateValue += groupState[str as keyof typeof groupState] || 0;
    }

    let searchValue = 0;
    if (groupQuery) {
      for (const filter of groupQuery.split(",")) {
        searchValue += Number(filter.split("-")[0]);
      }
    }
    return stateValue || searchValue;
  }, [groupQuery, groupState]);

  return (
    <aside className="flex w-[250px] flex-grow flex-col gap-6 border-r-1.5 border-zinc-300/60 p-4 pt-8 tablet:hidden tablet:border-b tablet:pt-4 largeTabletAndBelow:w-[250px]">
      <h2 className="font-semibold text-black/80">Filters:</h2>
      <div className="flex flex-col gap-4 tablet:!w-full tablet:flex-row tablet:overflow-x-auto">
        <SelectInput
          label="Type"
          value={type || ""}
          className="tablet:!w-[150px]"
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
          className="tablet:!w-[150px]"
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
        <ClickAwayListener onClickAway={onClose}>
          <div className="flex flex-col gap-2">
            <label htmlFor="group" className="!text-sm !font-semibold text-info-500">
              Group
            </label>
            <OutlinedInput
              readOnly
              slotProps={{
                input: {
                  readOnly: true,
                  style: {
                    cursor: "pointer",
                  },
                },
              }}
              value={`${group} people`}
              id="group"
              className="!w-full !cursor-pointer"
              onClick={(e) => (anchorEl ? setAnchorEl(null) : setAnchorEl(e.currentTarget))}
            />
            <Popper open={open} anchorEl={anchorEl} placement="bottom-start" transition>
              {({ TransitionProps }) => (
                <Fade {...TransitionProps} timeout={350}>
                  <Paper className="flex !w-full flex-col gap-6 !p-4">
                    {groupFilters.map((_str, index) => {
                      const str = _str as keyof typeof groupQuery;

                      return (
                        <div className="flex items-center gap-5" key={index}>
                          <div className="flex items-center gap-4">
                            <Button
                              className="!w-fit !min-w-0"
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setGroupState((prev) => ({ ...prev, [str]: prev[str] + 1 }));
                              }}
                            >
                              <FaPlus className="text-black" />
                            </Button>
                            <p className="text-lg font-bold">{groupState[str]}</p>
                            <Button
                              className="!w-fit !min-w-0"
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                setGroupState((prev) => ({
                                  ...prev,
                                  [str]: prev[str] ? prev[str] - 1 : prev[str],
                                }));
                              }}
                            >
                              <FaMinus className="text-black" />
                            </Button>
                          </div>
                          <p className="text-sm capitalize">{str}</p>
                        </div>
                      );
                    })}
                  </Paper>
                </Fade>
              )}
            </Popper>
          </div>
        </ClickAwayListener>
      </div>
    </aside>
  );
}
