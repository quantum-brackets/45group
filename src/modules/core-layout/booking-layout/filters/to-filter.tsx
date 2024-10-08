"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClickAwayListener, Fade, OutlinedInput, Paper, Popper } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers";
import dayjs from "dayjs";

export default function ToFilter() {
  const searchParams = useSearchParams();

  const from = searchParams.get("from");

  const [value, setValue] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="to" className="!text-sm !font-semibold text-info-500">
        To
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
            id="to"
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
                      // minDate={from ? dayjs(from) : undefined}
                      shouldDisableDate={(date) => {
                        if (from) {
                          return dayjs(date).isBefore(dayjs(from), "day");
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
