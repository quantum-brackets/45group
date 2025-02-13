"use client";

import { useState } from "react";
import Image from "next/image";
import { ClickAwayListener, Fade, IconButton, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";
import { TbTrash } from "react-icons/tb";

type Props = {
  name: string;
  url: string;
  handleDelete: () => void;
};

export default function MediaCard({ name, url, handleDelete }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  return (
    <div className="flex items-center justify-between gap-8">
      <figure className="relative size-16 overflow-hidden rounded-md border-[0.5px] border-black/10">
        <Image
          src={url}
          alt={`${name} images`}
          className="h-full w-full object-contain p-[2px]"
          sizes="100%"
          fill
        />
      </figure>
      <ClickAwayListener onClickAway={handleClose}>
        <div>
          <IconButton
            size="small"
            onClick={(e) => (isOpen ? handleClose() : handleClick(e.currentTarget))}
          >
            <GoKebabHorizontal className="text-black" />
          </IconButton>
          <Popper
            open={isOpen}
            anchorEl={anchorEl}
            transition
            placement="bottom-end"
            className="!z-[9999]"
          >
            {({ TransitionProps }) => (
              <Fade {...TransitionProps}>
                <Paper>
                  <button
                    onClick={() => {
                      handleDelete();
                      handleClose();
                    }}
                  >
                    <TbTrash />
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
