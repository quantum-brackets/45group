"use client";

import { useState } from "react";
import { Checkbox, ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";

type Props = {
  onDelete: () => void;
  checked: boolean;
  onChange: () => void;
};

export default function SelectCard({ onDelete, checked, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  return (
    <div className="flex w-full items-center justify-between gap-8 rounded p-2 transition duration-300 ease-in-out hover:bg-zinc-100">
      <div>
        <Checkbox checked={checked} onChange={onChange} size="small" />
        <small>No Pets</small>
      </div>
      <ClickAwayListener onClickAway={onClose}>
        <div className="self-center">
          <button onClick={(e) => (open ? onClose() : setAnchorEl(e.currentTarget))} type="button">
            <GoKebabHorizontal className="rotate-90" />
          </button>
          <Popper open={open} anchorEl={anchorEl}>
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={350}>
                <Paper className="popper-btn">
                  <button onClick={onDelete} type="button">
                    <span>Delete</span>
                  </button>
                </Paper>
              </Fade>
            )}
          </Popper>
        </div>
      </ClickAwayListener>
    </div>
  );
}
