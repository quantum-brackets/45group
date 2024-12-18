import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";

type Props = {
  updateSearchParams: (value: string) => void;
  autoApply?: boolean;
  value: string;
  updateValue: (value: string) => void;
};

export default function TypeFilter({
  updateSearchParams,
  autoApply = true,
  value,
  updateValue,
}: Props) {
  return (
    <SelectInput
      label="Type"
      value={value}
      onChange={(e) => {
        const value = e.target.value as string;
        updateValue(value);
        if (autoApply) updateSearchParams(value);
      }}
    >
      <MenuItem value={"rooms"}>Rooms</MenuItem>
      <MenuItem value={"events"}>Events</MenuItem>
      <MenuItem value={"dining"}>Dining</MenuItem>
    </SelectInput>
  );
}
