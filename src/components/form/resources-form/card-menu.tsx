"use client";

import { ReactNode, useState } from "react";
import { ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";

type Props = {
  children: ReactNode | ((props: { onClose: () => void }) => ReactNode);
};

export default function CardMenu({ children }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  return (
    <ClickAwayListener onClickAway={onClose}>
      <div className="self-center">
        <button onClick={(e) => (open ? onClose() : setAnchorEl(e.currentTarget))} type="button">
          <GoKebabHorizontal className="rotate-90" />
        </button>
        <Popper open={open} anchorEl={anchorEl}>
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper className="popper-btn">
                {typeof children === "function"
                  ? children({ onClose }) // Call the function child with onClose
                  : children}
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
