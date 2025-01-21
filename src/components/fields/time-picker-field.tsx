"use client";

import { InputLabel, InputLabelProps } from "@mui/material";
import { LocalizationProvider, TimePicker, TimePickerProps } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { cn } from "~/utils/helpers";

type Props = Omit<TimePickerProps<Dayjs>, "value" | "onChange"> &
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
  format = "hh:mm A",
  labelProps,
  ...props
}: Props) {
  return (
    <Field {...props}>
      {({ field, form }: FieldProps) => {
        // Convert the string value to Dayjs object for the TimePicker
        const value = field.value ? dayjs(field.value, format) : null;

        return (
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
                value={value}
                className={cn("w-full", className)}
                sx={{
                  "& .MuiOutlinedInput-input": {
                    padding: "11px 13.5px",
                  },
                  ...sx,
                }}
                disablePast
                format={format}
                ampm={true}
                onChange={(newValue: Dayjs | null) => {
                  const formattedTime = newValue?.format(format) || "";
                  form.setFieldValue(field.name, formattedTime);
                }}
                slotProps={{
                  textField: {
                    error: Boolean(form.touched[field.name] && form.errors[field.name]),
                  },
                }}
              />
            </LocalizationProvider>
            <ErrorMessage
              name={props.name}
              className={`pl-1 !text-xs !font-medium !text-red-600`}
              component="p"
            />
          </div>
        );
      }}
    </Field>
  );
}
