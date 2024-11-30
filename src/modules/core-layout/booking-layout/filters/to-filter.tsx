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

const ToFilter = forwardRef(({ autoApply = true }: Props, ref) => {
  const searchParams = useSearchParams();
  const endDate = searchParams.get("to");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
    endDate ? dayjs(endDate, DATE_FORMAT) : null
  );

  function updateEndDateParam(date: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("to", date);
    window.history.replaceState(null, "", `/booking?${params.toString()}`);
  }

  useEffect(() => {
    setSelectedDate(endDate ? dayjs(endDate, DATE_FORMAT) : null);
  }, [endDate]);

  useImperativeHandle(ref, () => ({
    applyEndDate: () => selectedDate && updateEndDateParam(selectedDate.format(DATE_FORMAT)),
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
          value={selectedDate}
          onChange={(date: Dayjs | null) => {
            setSelectedDate(date);
            if (autoApply && date) {
              updateEndDateParam(date.format(DATE_FORMAT));
            }
          }}
        />
      </LocalizationProvider>
    </div>
  );
});

ToFilter.displayName = "ToFilter";

export default ToFilter;
