"use client";

import { InputLabel, InputLabelProps } from "@mui/material";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { MuiTelInput, MuiTelInputProps } from "mui-tel-input";
import { cn } from "~/utils/helpers";

type Props = MuiTelInputProps &
  FieldConfig & {
    wrapperClassName?: string;
    labelProps?: InputLabelProps;
  };

export default function PhoneNumberField({
  className,
  wrapperClassName,
  color,
  required,
  sx,
  label,
  type,
  labelProps,
  ...props
}: Props) {
  return (
    <Field {...props}>
      {({ field }: FieldProps) => (
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
          <MuiTelInput
            className={cn("w-full divide-y-4", className)}
            {...field}
            {...props}
            defaultCountry="NG"
            InputProps={{
              sx: {
                "&.MuiOutlinedInput-root": {
                  paddingLeft: "7.5px",
                  "& .MuiInputAdornment-root": {
                    "& button": {
                      "& .MuiTelInput-Flag > img": {
                        width: "19px",
                        height: "14px",
                      },
                    },
                  },
                },
              },
            }}
            MenuProps={{
              sx: {
                "& .MuiTelInput-Flag > img": {
                  width: "21px",
                  height: "16px",
                },
                "& .MuiTypography-root": {
                  fontSize: "0.875rem",
                },
              },
            }}
            onChange={(newValue: string) => {
              field.onChange({
                target: {
                  name: props.name,
                  value: newValue,
                },
              });
            }}
          />
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
