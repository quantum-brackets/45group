"use client";

import { memo } from "react";
import { Checkbox } from "@mui/material";
import CardMenu from "./card-menu";

type Props = {
  onDelete: () => void;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  description?: string;
};

const SelectCard = memo(({ onDelete, checked, onChange, description, name }: Props) => {
  return (
    <div className="flex w-full items-center justify-between gap-8 rounded p-2 transition duration-300 ease-in-out hover:bg-zinc-100">
      <div className="flex items-center gap-4">
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} size="small" />
        <div className="flex flex-col gap-1">
          <small className="font-medium">{name}</small>
          {description && <small className="text-xs text-zinc-600">{description}</small>}
        </div>
      </div>
      <CardMenu>
        {({ onClose }) => (
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            type="button"
          >
            <span>Delete</span>
          </button>
        )}
      </CardMenu>
    </div>
  );
});

SelectCard.displayName = "SelectCard";

export default SelectCard;
