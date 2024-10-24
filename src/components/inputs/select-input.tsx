import { InputLabel, InputLabelProps, Select, SelectProps } from "@mui/material";
import { cn } from "~/utils/helpers";

type Props = SelectProps & {
  labelProps?: InputLabelProps;
};

export default function SelectInput({
  children,
  sx,
  className,
  label,
  labelProps,
  ...props
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <InputLabel {...labelProps} className="!text-sm !font-semibold">
          {label}
        </InputLabel>
      )}
      <Select
        displayEmpty
        {...props}
        className={cn(className)}
        sx={{
          "& .MuiFilledInput-input": {
            borderTop: "0px",
            borderRight: "0px",
            borderLeft: "0px",
            borderWidth: "2px",
            borderColor: "#0e82bb !important",
            borderRadius: "4px",
            fontSize: "12px",
          },
          ...sx,
        }}
      >
        {children}
      </Select>
    </div>
  );
}
