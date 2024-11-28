"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClickAwayListener,
  Fade,
  OutlinedInput,
  Paper,
  Popper,
  useMediaQuery,
} from "@mui/material";
import { FaMinus, FaPlus } from "react-icons/fa6";
import debounce from "lodash.debounce";
import Button from "~/components/button";
import theme from "~/app/theme";

type Props = {
  autoApply?: boolean;
};

const groupFilters = ["adults", "children", "seniors"];

const GroupFilter = forwardRef(({ autoApply = true }: Props, ref) => {
  const isTablet = useMediaQuery(theme.breakpoints.down(900));
  const searchParams = useSearchParams();

  const groupQuery = searchParams.get("group") || "";

  const parseGroupQuery = (query: string) => {
    const initialGroupState = groupFilters.reduce(
      (acc, filter) => {
        acc[filter] = 0;
        return acc;
      },
      {} as Record<string, number>
    );

    if (query) {
      query.split(",").forEach((filter) => {
        const [val, key] = filter.split("-");
        initialGroupState[key as keyof typeof initialGroupState] = Number(val);
      });
    }

    return initialGroupState;
  };

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [tempGroupState, setTempGroupState] = useState<Record<string, number>>(() =>
    parseGroupQuery(groupQuery)
  );

  const open = Boolean(anchorEl);

  const debouncedSetGroup = useMemo(
    () =>
      debounce((group: typeof tempGroupState) => {
        let values = {} as typeof tempGroupState;
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
    setTempGroupState(parseGroupQuery(groupQuery));
  }, [groupQuery]);

  useEffect(() => {
    if (autoApply && !isTablet) {
      debouncedSetGroup(tempGroupState);
    }
    return () => {
      debouncedSetGroup.cancel();
    };
  }, [debouncedSetGroup, tempGroupState, autoApply, isTablet]);

  const groupCount = useMemo(() => {
    return Object.values(tempGroupState).reduce((sum, val) => sum + val, 0);
  }, [tempGroupState]);

  function onClose() {
    setAnchorEl(null);
  }

  const handleApplyFilter = useCallback(() => {
    debouncedSetGroup(tempGroupState);
    debouncedSetGroup.flush();

    onClose();
  }, [debouncedSetGroup, tempGroupState]);

  useImperativeHandle(ref, () => ({
    triggerApplyFilter: handleApplyFilter,
  }));

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
          value={`${groupCount} people`}
          id="group"
          className="!w-full !cursor-pointer"
          onClick={(e) => (anchorEl ? setAnchorEl(null) : setAnchorEl(e.currentTarget))}
        />
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-start"
          transition
          className="tablet:!z-[2000]"
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper className="flex !w-full flex-col gap-6 !p-4">
                {groupFilters.map((filter, index) => (
                  <div className="flex items-center gap-3 largeLaptop:gap-5" key={index}>
                    <div className="flex items-center gap-3 largeLaptop:gap-4">
                      <Button
                        className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setTempGroupState((prev) => ({
                            ...prev,
                            [filter]: prev[filter] + 1,
                          }))
                        }
                      >
                        <FaPlus className="text-xs text-black largeLaptop:text-sm" />
                      </Button>
                      <p className="text-base font-bold largeLaptop:text-lg">
                        {tempGroupState[filter]}
                      </p>
                      <Button
                        className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setTempGroupState((prev) => ({
                            ...prev,
                            [filter]: Math.max(0, prev[filter] - 1),
                          }))
                        }
                      >
                        <FaMinus className="text-xs text-black largeLaptop:text-sm" />
                      </Button>
                    </div>
                    <p className="text-xs capitalize largeLaptop:text-sm">{filter}</p>
                  </div>
                ))}
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
});

GroupFilter.displayName = "GroupFilter";

export default GroupFilter;
