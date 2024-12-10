"use client";

import { useState } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import { ClickAwayListener, Fade, MenuItem, Paper, Popper } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FormikHelpers } from "formik";
import { GoKebabHorizontal } from "react-icons/go";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import CollapseSection from "~/components/resources-form/collapse-section";
import SelectField from "~/components/fields/select-field";
import Button from "~/components/button";

const DATE_FORMAT = "DD-MM-YYYY";

type Props = {
  setFieldValue: FormikHelpers<ResourceFormValues>["setFieldValue"];
  values: ResourceFormValues;
};

export default function AvailabitySection({ values, setFieldValue }: Props) {
  const [{ startDate, endDate }, setDates] = useState<
    Record<"startDate" | "endDate", string | null>
  >({
    startDate: null,
    endDate: null,
  });

  function closeForm() {
    setFieldValue("_show_availabilities_form", false);
  }

  return (
    <CollapseSection
      name="_show_availabilities"
      setFieldValue={setFieldValue}
      subtitle="Here you can add the available dates when this resource will be available."
      title="Availability"
      values={values}
      addBtn={{
        show: !values._show_availabilities_form,
        text: "Add an availability",
        onClick: () => {
          setFieldValue("_show_availabilities_form", true);
        },
      }}
    >
      <div className="flex w-full flex-col gap-1">
        {values.availabilities.map(({ from, status, to }, index) => {
          const key = "_availability_anchor_el";
          const open = Boolean(values[key]);

          function onClose() {
            setFieldValue(key, null);
          }

          return (
            <div key={index} className="p-2 transition duration-300 ease-in-out hover:bg-zinc-100">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <p>From: {from}</p>
                  <p>To: {to}</p>
                </div>
                <span>{status}</span>
              </div>
              <ClickAwayListener onClickAway={onClose}>
                <div className="self-center">
                  <button
                    onClick={(e) => (open ? onClose() : setFieldValue(key, e.currentTarget))}
                    type="button"
                  >
                    <GoKebabHorizontal className="rotate-90" />
                  </button>
                  <Popper open={open} anchorEl={values[key]}>
                    {({ TransitionProps }) => (
                      <Fade {...TransitionProps} timeout={350}>
                        <Paper className="popper-btn">
                          <button type="button">
                            <span>Remove</span>
                          </button>
                        </Paper>
                      </Fade>
                    )}
                  </Popper>
                </div>
              </ClickAwayListener>
            </div>
          );
        })}
      </div>
      {values._show_availabilities_form && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-4 largeMobile:flex-col">
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
                maxDate={endDate ? dayjs(endDate, DATE_FORMAT) : undefined}
                value={startDate ? dayjs(startDate, DATE_FORMAT) : null}
                onChange={(date: Dayjs | null) => {
                  date && setDates((prev) => ({ ...prev, startDate: date.format(DATE_FORMAT) }));
                }}
              />
            </LocalizationProvider>
            <small>To</small>
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
                maxDate={startDate ? dayjs(startDate, DATE_FORMAT) : undefined}
                value={endDate ? dayjs(endDate, DATE_FORMAT) : null}
                onChange={(date: Dayjs | null) => {
                  date && setDates((prev) => ({ ...prev, endDate: date.format(DATE_FORMAT) }));
                }}
              />
            </LocalizationProvider>
          </div>
          <SelectField
            label="Status"
            name="_status"
            placeholder="Choose a status"
            className="capitalize"
          >
            <MenuItem value={"available"}>Available</MenuItem>
            <MenuItem value={"unavailable"}>Unavailable</MenuItem>
          </SelectField>
          <div className="flex w-full items-center justify-between gap-8">
            <Button type="button" variant="outlined" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="button" onClick={closeForm}>
              Add
            </Button>
          </div>
        </div>
      )}
    </CollapseSection>
  );
}
