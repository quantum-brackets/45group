"use client";

import { Chip } from "@mui/material";
import { MdEvent, MdOutlineBedroomChild, MdRestaurantMenu } from "react-icons/md";
import { Resource } from "~/db/schemas/resources";
import { cn } from "~/utils/helpers";

type Props = {
  type: Resource["type"];
  className?: string;
};

const resourceConfig: Record<Resource["type"], { label: string; icon: JSX.Element }> = {
  lodge: {
    label: "Rooms",
    icon: <MdOutlineBedroomChild className={cn("text-base")} />,
  },
  dining: {
    label: "Dining",
    icon: <MdRestaurantMenu className={cn("text-base")} />,
  },
  event: {
    label: "Events",
    icon: <MdEvent className={cn("text-base")} />,
  },
};

export default function ResourceTypeChip({ type, className }: Props) {
  const { label, icon } = resourceConfig[type];

  return (
    <Chip
      label={label}
      icon={icon}
      color="info"
      variant="outlined"
      className={cn("!justify-end !border-transparent !px-0 [&_span]:!pr-0", className)}
    />
  );
}
