import { MenuItem } from "@mui/material";
import SelectInput from "~/components/inputs/select-input";

type Props = {
  updateSearchParams: (value: string) => void;
  autoApply?: boolean;
  value: string;
  updateValue: (value: string) => void;
};

export default function CityFilter({
  value,
  updateValue,
  updateSearchParams,
  autoApply = true,
}: Props) {
  return (
    <SelectInput
      label="City"
      value={value}
      onChange={(e) => {
        const value = e.target.value as string;
        updateValue(value);
        if (autoApply) updateSearchParams(value);
      }}
      emptyText="Select a city"
    >
      <MenuItem value={"abuja"}>Abuja</MenuItem>
      <MenuItem value={"calabar"}>Calabar</MenuItem>
      <MenuItem value={"ikom"}>Ikom</MenuItem>
    </SelectInput>
  );
}
