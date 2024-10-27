"use client";

import { InputLabel, InputLabelProps } from "@mui/material";
import { MuiOtpInput, MuiOtpInputProps } from "mui-one-time-password-input";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { cn } from "~/utils/helpers";

type Props = MuiOtpInputProps &
  FieldConfig & {
    label?: string;
    labelProps?: InputLabelProps;
    required?: boolean;
  };

export default function OTPField({
  className,
  label,
  labelProps,
  required,
  TextFieldsProps,
  sx,
  ...props
}: Props) {
  return (
    <Field {...props}>
      {({ field, meta, form }: FieldProps) => (
        <div className="flex w-full flex-col gap-1">
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
          <MuiOtpInput
            {...field}
            {...props}
            autoFocus
            validateChar={(char) => /^\d+$/.test(char)}
            className={cn(
              "mx-auto mediumMobile:!gap-[8px] largeMobile:w-full largeMobile:gap-[10px]",
              className
            )}
            onChange={(value) => {
              if (value === field.value) return;
              form.setFieldValue(props.name, value);
            }}
            TextFieldsProps={{
              variant: "outlined",
              className: " [@media(max-width:660px)]:w-fit",
              inputMode: "numeric",
              type: "tel",
              label: null,
              ...TextFieldsProps,
            }}
            sx={{
              "& .MuiFormControl-root .MuiOutlinedInput-root input": {
                paddingLeft: "4px",
                paddingRight: "4px",
              },
              ...sx,
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
