import { TextField, TextFieldProps } from "@mui/material";
import { ErrorMessage, Field, FieldConfig, FieldProps } from "formik";
import { cn } from "~/utils/helpers";

type Props = TextFieldProps &
  FieldConfig & {
    wrapperClassName?: string;
  };

export default function FormField({
  className,
  wrapperClassName,
  color,
  required: _,
  ...props
}: Props) {
  return (
    <Field {...props}>
      {({ field, meta }: FieldProps) => (
        <div className={cn("flex w-full flex-col gap-1", wrapperClassName)}>
          <TextField
            {...field}
            {...props}
            className={cn(className)}
            sx={{
              "& .MuiOutlinedInput-input": {
                borderColor: `${props.InputProps?.readOnly ? "transparent" : "#0071B9"}`,
              },
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
