"use client";

import { Fragment, ReactNode, useState } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import { ClickAwayListener, Fade, keyframes, MenuItem, Paper, Popper } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FormikHelpers } from "formik";
import { GoKebabHorizontal } from "react-icons/go";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import CollapseSection from "~/components/form/resources-form/collapse-section";
import SelectField from "~/components/fields/select-field";
import Button from "~/components/button";
import { cn } from "~/utils/helpers";
import DatePickerField from "~/components/fields/date-picker-field";

const FORM_KEY = "availability_form" as const;

type Field = keyof ResourceFormValues[typeof FORM_KEY];
type Values = ResourceFormValues[typeof FORM_KEY];

type Props = {
  setFieldValue: (field: Field, value: any) => void;
  values: Values;
};

const DAY_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const SCHEDULE_TYPE = ["24/7", "custom", "weekdays", "weekends"] as const;

type DayOfWeeek = (typeof DAY_OF_WEEK)[number];
type ScheduleType = (typeof SCHEDULE_TYPE)[number];

function DateField({
  name,
  label,
}: {
  name: DayOfWeeek | Extract<ScheduleType, "weekdays" | "weekends">;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm capitalize text-zinc-700">
        {label || name}
      </label>
      <div className="flex items-center gap-4" id={name}>
        <DatePickerField name={`custom.${name}.start`} /> <span>To</span>{" "}
        <DatePickerField name={`custom.${name}.end`} />
      </div>
    </div>
  );
}

const components: Record<ScheduleType, ReactNode> = {
  "24/7": (
    <div className="flex items-center gap-4">
      <p>24 Hours</p> <span className="text-xl text-zinc-800">&#8594;</span>{" "}
      <p>12:00 AM to 11:59 PM</p>
    </div>
  ),
  custom: (
    <div className="flex flex-col gap-4">
      {DAY_OF_WEEK.map((day, index) => (
        <DateField key={index} name={day} />
      ))}
    </div>
  ),
  weekdays: <DateField name="weekdays" label="Monday to Friday" />,
  weekends: <DateField name="weekends" label="Saturday and Sunday" />,
};

export default function AvailabilitySection({ values, setFieldValue }: Props) {
  const [choice, setChoice] = useState<ScheduleType>("24/7");

  return (
    <CollapseSection
      name="_show_availabilities"
      setFieldValue={setFieldValue}
      subtitle="Select the days and times this resource is available each week."
      title="Availability"
      values={values}
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center gap-2">
          {SCHEDULE_TYPE.map((type, index) => (
            <button
              key={index}
              className={cn("rounded-full bg-zinc-100 p-6 py-2 text-sm capitalize", {
                "bg-primary text-white": choice === type,
              })}
              onClick={() => {
                const newChoice = type as ScheduleType;
                setChoice(newChoice);
                setFieldValue(`schedule_type`, newChoice);
              }}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
        <div>
          {Object.entries(components).map(([key, value], index) => {
            if (key !== choice) return;
            return <Fragment key={index}>{value}</Fragment>;
          })}
        </div>
      </div>
    </CollapseSection>
  );
}
