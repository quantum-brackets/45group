"use client";

import { InputLabel, InputLabelProps } from "@mui/material";
import { LocalizationProvider, TimePicker, TimePickerProps } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { cn } from "~/utils/helpers";

type Props = TimePickerProps<Dayjs> &
  FieldConfig & {
    wrapperClassName?: string;
    labelProps?: InputLabelProps;
    required?: boolean;
  };

export default function TimePickerField({
  className,
  wrapperClassName,
  required,
  sx,
  label,
  type,
  format = "DD-MM-YYYY",
  labelProps,
  ...props
}: Props) {
  return (
    <Field {...props}>
      {({ field, form }: FieldProps) => (
        <div className={cn("flex w-full flex-col gap-1", wrapperClassName)}>
          {label && (
            <div className="flex w-full items-center justify-between">
              <InputLabel
                {...labelProps}
                htmlFor={props.name}
                className={cn(`!text-xs`, labelProps?.className)}
              >
                {label}
                {required && <span className="pl-1 !text-xs !text-red-600">*</span>}
              </InputLabel>
            </div>
          )}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              {...field}
              {...props}
              className={cn("w-full", className)}
              sx={{
                "& .MuiOutlinedInput-input": {
                  padding: "11px 13.5px",
                },
              }}
              disablePast
              format={format}
              onChange={(date: Dayjs | null) => {
                date && form.setFieldValue(field.name, date.format(format));
              }}
            />
          </LocalizationProvider>
          <ErrorMessage
            name={props.name}
            className={`pl-1 !text-xs !font-medium !text-red-600`}
            component={"p"}
          />
        </div>
      )}
    </Field>
  );
}
