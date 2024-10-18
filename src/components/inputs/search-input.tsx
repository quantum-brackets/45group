import { OutlinedInput, OutlinedInputProps } from "@mui/material";
import { FiSearch } from "react-icons/fi";
import { cn } from "~/utils/helpers";

type Props = Omit<OutlinedInputProps, "type" | "startAdornment">;

export default function SearchInput({
  className,
  placeholder = "Search here...",
  sx,
  ...props
}: Props) {
  return (
    <OutlinedInput
      type="search"
      startAdornment={<FiSearch className="!text-info-500/20 text-[21px]" />}
      {...props}
      className={cn("!rounded-md !border-zinc-600", className)}
      placeholder={placeholder}
      sx={{
        "& input": {
          padding: "12px 14px 12px 10px",
          fontSize: "0.8rem",
          "::placeholder": {
            color: "#98A2B3 !important",
            fontSize: "0.8rem",
          },
        },
        ...sx,
      }}
    />
  );
}
