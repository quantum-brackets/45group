"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClickAwayListener, Fade, OutlinedInput, Paper, Popper } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers";
import dayjs from "dayjs";

export default function FromFilter() {
  const searchParams = useSearchParams();

  const to = searchParams.get("to");

  const [value, setValue] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="from" className="!text-sm !font-semibold text-info-500">
        From
      </label>
      <ClickAwayListener onClickAway={onClose}>
        <div>
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
            value={value}
            id="from"
            className="!w-full !cursor-pointer"
            onClick={(e) => (anchorEl ? setAnchorEl(null) : setAnchorEl(e.currentTarget))}
          />
          <Popper open={open} anchorEl={anchorEl} placement="bottom-start" transition>
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={350}>
                <Paper className="!p-0">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar
                      onChange={(value) => setValue(dayjs(value).format("ll"))}
                      // maxDate={to ? dayjs(to) : undefined}
                      shouldDisableDate={(date) => {
                        if (to) {
                          return dayjs(date).isAfter(dayjs(to), "day");
                        }
                        return false;
                      }}
                    />
                  </LocalizationProvider>
                </Paper>
              </Fade>
            )}
          </Popper>
        </div>
      </ClickAwayListener>
    </div>
  );
}
