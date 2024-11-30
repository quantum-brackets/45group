"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

const DATE_FORMAT = "DD-MM-YYYY";

type Props = {
  autoApply?: boolean;
};

const FromFilter = forwardRef(({ autoApply = true }: Props, ref) => {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("from");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
    startDate ? dayjs(startDate, DATE_FORMAT) : null
  );

  function updateStartDateParam(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", date);
    window.history.replaceState(null, "", `/booking?${params.toString()}`);
  }

  useEffect(() => {
    setSelectedDate(startDate ? dayjs(startDate, DATE_FORMAT) : null);
  }, [startDate]);

  useImperativeHandle(ref, () => ({
    applyStartDate: () => selectedDate && updateStartDateParam(selectedDate.format(DATE_FORMAT)),
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
          value={selectedDate}
          onChange={(date: Dayjs | null) => {
            setSelectedDate(date);
            if (autoApply && date) {
              updateStartDateParam(date.format(DATE_FORMAT));
            }
          }}
        />
      </LocalizationProvider>
    </div>
  );
});

FromFilter.displayName = "FromFilter";

export default FromFilter;
