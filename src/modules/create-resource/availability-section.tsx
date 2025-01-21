"use client";

import { Fragment, ReactNode, useState } from "react";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import CollapseSection from "~/components/form/resources-form/collapse-section";
import { cn } from "~/utils/helpers";
import TimePickerField from "~/components/fields/time-picker-field";
import { DAY_OF_WEEK, SCHEDULE_TYPE } from "~/utils/constants";

const FORM_KEY = "availability_form" as const;

type Field = keyof ResourceFormValues[typeof FORM_KEY];
type Values = ResourceFormValues[typeof FORM_KEY];

type Props = {
  setFieldValue: (field: Field, value: any) => void;
  values: Values;
};

function TimeField({
  name,
  day,
  label,
  values,
}: {
  name: Exclude<ScheduleType, "24/7">;
  day?: DayOfWeek;
  label?: string;
  values: Values &
    Partial<
      Record<
        Exclude<ScheduleType, "24/7">,
        | Record<DayOfWeek, Record<"start_time" | "end_time", string>>
        | Record<"start_time" | "end_time", string>
      >
    >;
}) {
  const startKey = `${FORM_KEY}.${name}${day ? `.${day}` : ""}.start_time`;
  const endKey = `${FORM_KEY}.${name}${day ? `.${day}` : ""}.end_time`;

  const dayValues = day && name ? (values[name] as any)?.[day] : (values[name] as any);
  const minTime = dayValues?.start_time;
  const maxTime = dayValues?.end_time;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs capitalize text-zinc-700">
        {label || day || name}
      </label>
      <div className="flex items-center gap-4" id={name}>
        <TimePickerField name={startKey} maxTime={maxTime} /> <span className="text-xs">To</span>{" "}
        <TimePickerField name={endKey} minTime={minTime} />
      </div>
    </div>
  );
}

const components: Record<ScheduleType, (values: Values) => ReactNode> = {
  "24/7": () => {
    return (
      <div className="flex items-center gap-4">
        <p>24 Hours</p> <span className="text-xl text-zinc-800">&#8594;</span>{" "}
        <p>12:00 AM to 11:59 PM</p>
      </div>
    );
  },
  custom: (values) => {
    return (
      <div className="flex flex-col gap-4">
        {DAY_OF_WEEK.map((day, index) => (
          <TimeField key={index} day={day} name="custom" values={values} />
        ))}
      </div>
    );
  },
  weekdays: (values) => <TimeField name="weekdays" label="Monday to Friday" values={values} />,
  weekends: (values) => <TimeField name="weekends" label="Saturday and Sunday" values={values} />,
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
          {Object.entries(components).map(([key, component], index) => {
            if (key !== choice) return;
            return <Fragment key={index}>{component(values)}</Fragment>;
          })}
        </div>
      </div>
    </CollapseSection>
  );
}
