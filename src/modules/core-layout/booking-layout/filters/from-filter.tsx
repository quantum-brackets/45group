"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

const DATE_FORMAT = "DD-MM-YYYY";

type Props = {
  autoApply?: boolean;
  dates: {
    startDate: Dayjs | null;
    endDate: Dayjs | null;
  };
  updateDate: (date: Dayjs) => void;
};

const FromFilter = forwardRef(
  ({ autoApply = true, dates: { startDate, endDate }, updateDate }: Props, ref) => {
    const searchParams = useSearchParams();
    const startDateQuery = searchParams.get("from");

    const updateStartDateParam = useCallback(
      (date: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", date);
        window.history.replaceState(null, "", `/booking?${params.toString()}`);
      },
      [searchParams]
    );

    useEffect(() => {
      startDateQuery && updateDate(dayjs(startDateQuery, DATE_FORMAT));
    }, [startDateQuery, updateDate]);

    useImperativeHandle(ref, () => ({
      applyStartDate: () => startDate && updateStartDateParam(startDate.format(DATE_FORMAT)),
    }));

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor="from" className="!text-sm !font-semibold text-info-500">
          From
        </label>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            className={"w-full"}
            sx={{
              "& .MuiOutlinedInput-input": {
                padding: "11px 13.5px",
              },
            }}
            disablePast
            format={DATE_FORMAT}
            maxDate={endDate || undefined}
            value={startDate}
            onChange={(date: Dayjs | null) => {
              date && updateDate(date);
              if (autoApply && date) {
                updateStartDateParam(date.format(DATE_FORMAT));
              }
            }}
          />
        </LocalizationProvider>
      </div>
    );
  }
);

FromFilter.displayName = "FromFilter";

export default FromFilter;
