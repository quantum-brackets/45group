"use client";

import { Chip } from "@mui/material";
import { MdEvent, MdOutlineBedroomChild, MdRestaurantMenu } from "react-icons/md";
import { Resource } from "~/db/schemas/resources";
import { cn } from "~/utils/helpers";

type Props = {
  type: Resource["type"];
  className?: string;
};

export default function ResourceTypeChip({ type, className }: Props) {
  switch (type) {
    case "lodge":
      return (
        <Chip
          label="Rooms"
          icon={<MdOutlineBedroomChild className={cn("text-base", className)} />}
          color="info"
          variant="outlined"
        />
      );
    case "dining":
      return (
        <Chip
          label="Dining"
          icon={<MdRestaurantMenu className={cn("text-base", className)} />}
          color="info"
          variant="outlined"
        />
      );
    default:
      return (
        <Chip
          label="Events"
          icon={<MdEvent className={cn("text-base", className)} />}
          color="info"
          variant="outlined"
        />
      );
  }
}
