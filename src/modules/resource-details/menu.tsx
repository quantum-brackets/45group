"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClickAwayListener, Fade, IconButton, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";
import { TbTrash } from "react-icons/tb";
import nProgress from "nprogress";
import EditModal from "./edit-modal";
import { useDeleteLocation } from "~/hooks/locations";
import usePrompt from "~/hooks/prompt";

export default function ResourceDetailsMenu() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  const { mutateAsync: deleteLocation, isPending: isDeleting } = useDeleteLocation();

  const prompt = usePrompt();

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await prompt({
        title: "Please confirm",
        description: "Are you sure you want delete this location?",
        isLoading: isDeleting,
      });

      if (confirmed) {
        await deleteLocation(id);
        router.push("/admin/resources");
        nProgress.start();
      }
    },
    [deleteLocation, isDeleting, prompt, router]
  );

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        <IconButton
          size="small"
          onClick={(e) => (isOpen ? handleClose() : handleClick(e.currentTarget))}
        >
          <GoKebabHorizontal className="text-black" />
        </IconButton>
        <Popper open={isOpen} anchorEl={anchorEl} transition placement="bottom-end">
          {({ TransitionProps }) => (
            <Fade {...TransitionProps}>
              <Paper>
                <EditModal />
                <button onClick={() => handleDelete(id)}>
                  <TbTrash />
                  <span>Delete</span>
                </button>
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
