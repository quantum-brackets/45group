"use client";

import { useState } from "react";
import {
  IconButton,
  InputLabel,
  InputLabelProps,
  OutlinedInput,
  OutlinedInputProps,
} from "@mui/material";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { BsEyeSlash } from "react-icons/bs";
import { AiOutlineEye } from "react-icons/ai";
import { cn } from "~/utils/helpers";

type Props = OutlinedInputProps &
  FieldConfig & {
    wrapperClassName?: string;
    labelProps?: InputLabelProps;
  };

export default function FormField({
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
  const [showPassword, setShowPassword] = useState(false);

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
          <OutlinedInput
            className={cn("w-full", className)}
            {...field}
            {...props}
            sx={{
              input: {
                fontSize: "0.8rem",
                "::placeholder": {
                  fontSize: "0.8rem",
                },
              },
              "& .MuiOutlinedInput-input": {
                padding: "11px 13.5px",
              },
            }}
            type={showPassword ? "text" : "password"}
            endAdornment={
              type === "password" && (
                <IconButton
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <BsEyeSlash /> : <AiOutlineEye />}
                </IconButton>
              )
            }
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
