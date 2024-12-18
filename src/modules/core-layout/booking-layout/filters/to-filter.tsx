"use client";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

const DATE_FORMAT = "DD-MM-YYYY";

type Props = {
  autoApply?: boolean;
  dates: {
    startDate: string | null;
    endDate: string | null;
  };
  updateValue: (value: string) => void;
  updateSearchParams: (value: string) => void;
};

export default function ToFilter({
  autoApply = true,
  dates: { endDate, startDate },
  updateValue,
  updateSearchParams,
}: Props) {
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
          value={endDate ? dayjs(endDate, DATE_FORMAT) : null}
          minDate={startDate ? dayjs(startDate, DATE_FORMAT) : undefined}
          onChange={(date: Dayjs | null) => {
            const value = date ? date.format(DATE_FORMAT) : null;
            value && updateValue(value);
            if (autoApply && value) {
              updateSearchParams(value);
            }
          }}
        />
      </LocalizationProvider>
    </div>
  );
}
