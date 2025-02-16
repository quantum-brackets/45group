import {
  Select as MuiSelect,
  InputLabel,
  SelectProps as MuiSelectProps,
  InputLabelProps,
  MenuItem,
} from "@mui/material";
import { FieldConfig, Field, FieldProps, ErrorMessage } from "formik";
import { cn, getNestedValue } from "~/utils/helpers";

type Props = MuiSelectProps &
  FieldConfig & {
    wrapperClassName?: string;
    labelProps?: InputLabelProps;
    isLoading?: boolean;
    data?: any;
    emptyStateText?: string;
  };

export default function SelectField({
  label,
  wrapperClassName,
  className,
  labelProps,
  isLoading,
  required,
  data,
  emptyStateText,
  ...props
}: Props) {
  return (
    <Field>
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
          <MuiSelect
            className={cn(`w-full`, className)}
            {...field}
            {...props}
            value={form.values[props.name] ?? getNestedValue(field.value, props.name) ?? ""}
            sx={{
              "& .MuiSelect-select": {
                padding: "11px 13.5px",
              },
              input: {
                fontSize: "0.8rem",
                "::placeholder": {
                  fontSize: "0.8rem",
                },
              },
            }}
            renderValue={(value) => {
              if (!value) {
                return <span className="!normal-case !text-gray-500">{props.placeholder}</span>;
              }
              return value;
            }}
            displayEmpty={true}
            onClick={(e) => {
              e.stopPropagation();
              props.onClick?.(e);
            }}
            onChange={(e, child) => {
              const value = e.target.value;
              form.setFieldValue(props.name, value);
              props.onChange?.(e, child);
            }}
          >
            {isLoading || data ? (
              isLoading ? (
                <MenuItem value={""} disabled>
                  Loading...
                </MenuItem>
              ) : data ? (
                props.children
              ) : (
                <MenuItem value={""} disabled>
                  {emptyStateText}
                </MenuItem>
              )
            ) : (
              props.children
            )}
          </MuiSelect>
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
