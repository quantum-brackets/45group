"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { Resource } from "~/db/schemas/resources";
import { useUpdateResource } from "~/hooks/resources";
import ResourceStatusChip from "~/components/resource/status-chip";

type Props = {
  status: Resource["status"];
};

export default function ResourceStatus({ status }: Props) {
  const { id } = useParams<{ id: string }>();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  const { mutateAsync: updateResource } = useUpdateResource();

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        <button onClick={(e) => (isOpen ? handleClose() : handleClick(e.currentTarget))}>
          <ResourceStatusChip status={status} />
        </button>
        <Popper open={isOpen} anchorEl={anchorEl}>
          {({ TransitionProps }) => (
            <Fade {...TransitionProps}>
              <Paper>
                <button
                  onClick={async () => {
                    if (id) {
                      await updateResource({
                        id,
                        data: { status: "draft" },
                      });
                      handleClose();
                    }
                  }}
                >
                  <ResourceStatusChip status={"draft"} />
                </button>
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
