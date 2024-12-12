"use client";

import { useState } from "react";
import { Checkbox } from "@mui/material";
import CardMenu from "./card-menu";

type Props = {
  onDelete: () => void;
  checked: boolean;
  onChange: () => void;
};

export default function SelectCard({ onDelete, checked, onChange }: Props) {
  return (
    <div className="flex w-full items-center justify-between gap-8 rounded p-2 transition duration-300 ease-in-out hover:bg-zinc-100">
      <div>
        <Checkbox checked={checked} onChange={onChange} size="small" />
        <small>No Pets</small>
      </div>
      <CardMenu>
        <button onClick={onDelete} type="button">
          <span>Delete</span>
        </button>
      </CardMenu>
    </div>
  );
}
