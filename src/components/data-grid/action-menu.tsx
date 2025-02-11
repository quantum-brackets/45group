"use client";

import { ReactNode, useState } from "react";
import { ClickAwayListener, Fade, IconButton, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";

export default function ActionMenu<T extends { id: string | number }>({
  row,
  menuComp,
}: {
  row: T;
  menuComp: (props: { row: T; handleClose: () => void }) => ReactNode;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <ClickAwayListener onClickAway={handleClose}>
        <div>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (open) {
                handleClose();
              } else {
                handleClick(e.currentTarget);
              }
            }}
          >
            <GoKebabHorizontal className="rotate-180" />
          </IconButton>
          <Popper open={open} anchorEl={anchorEl} transition placement="bottom-end">
            {({ TransitionProps }) => (
              <Fade {...TransitionProps}>
                <Paper>{menuComp?.({ row, handleClose })}</Paper>
              </Fade>
            )}
          </Popper>
        </div>
      </ClickAwayListener>
    </>
  );
}
