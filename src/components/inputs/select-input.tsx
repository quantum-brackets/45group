import { FormControl, FormControlProps, InputLabel, Select, SelectProps } from "@mui/material";
import { cn } from "~/utils/helpers";

type Props = SelectProps & {
  formControl?: FormControlProps;
};

export default function SelectInput({ children, sx, className, label, ...props }: Props) {
  return (
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
  );
}