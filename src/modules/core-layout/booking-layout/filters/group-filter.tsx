"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClickAwayListener, debounce, Fade, OutlinedInput, Paper, Popper } from "@mui/material";
import { FaMinus, FaPlus } from "react-icons/fa6";
import Button from "~/components/button";

type Props = {
  groupQuery?: string;
};

const groupFilters = ["adults", "children", "seniors"];

export default function GroupFilter({ groupQuery }: Props) {
  const searchParams = useSearchParams();

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);

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

  function onClose() {
    setAnchorEl(null);
  }

  return (
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
                    <div className="flex items-center gap-3 largeLaptop:gap-5" key={index}>
                      <div className="flex items-center gap-3 largeLaptop:gap-4">
                        <Button
                          className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setGroupState((prev) => ({ ...prev, [str]: prev[str] + 1 }));
                          }}
                        >
                          <FaPlus className="text-xs text-black largeLaptop:text-sm" />
                        </Button>
                        <p className="text-base font-bold largeLaptop:text-lg">{groupState[str]}</p>
                        <Button
                          className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setGroupState((prev) => ({
                              ...prev,
                              [str]: prev[str] ? prev[str] - 1 : prev[str],
                            }));
                          }}
                        >
                          <FaMinus className="text-xs text-black largeLaptop:text-sm" />
                        </Button>
                      </div>
                      <p className="text-xs capitalize largeLaptop:text-sm">{str}</p>
                    </div>
                  );
                })}
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
