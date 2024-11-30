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

const ToFilter = forwardRef(
  ({ autoApply = true, dates: { endDate, startDate }, updateDate }: Props, ref) => {
    const searchParams = useSearchParams();
    const endDateQuery = searchParams.get("to");

    const updateEndDateParam = useCallback(
      (date: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("to", date);
        window.history.replaceState(null, "", `/booking?${params.toString()}`);
      },
      [searchParams]
    );

    useEffect(() => {
      endDateQuery && updateDate(dayjs(endDateQuery, DATE_FORMAT));
    }, [endDateQuery, updateDate]);

    useImperativeHandle(ref, () => ({
      applyEndDate: () => endDate && updateEndDateParam(endDate.format(DATE_FORMAT)),
    }));

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor="to" className="!text-sm !font-semibold text-info-500">
          To
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
            value={endDate}
            minDate={startDate || undefined}
            onChange={(date: Dayjs | null) => {
              date && updateDate(date);
              if (autoApply && date) {
                updateEndDateParam(date.format(DATE_FORMAT));
              }
            }}
          />
        </LocalizationProvider>
      </div>
    );
  }
);

ToFilter.displayName = "ToFilter";

export default ToFilter;
