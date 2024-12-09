"use client";

import { useState } from "react";
import Image from "next/image";
import { ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";
import { formatFileSize } from "~/utils/helpers";

type Props = {
  file: File;
  base64: string;
  onDelete: () => void;
};

export default function MediaCard({ file, base64, onDelete }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  return (
    <div className="flex w-full gap-4 rounded-md bg-white p-3 transition duration-300 ease-in-out hover:bg-zinc-100">
      <Image src={base64} alt={file.name} width={70} height={70} />
      <div className="flex w-full flex-col gap-1 text-xs">
        <small className="">{file.name}</small>
        <small className="text-zinc-600">{formatFileSize(file.size)}</small>
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
