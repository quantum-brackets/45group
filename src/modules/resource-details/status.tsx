"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { Resource } from "~/db/schemas/resources";
import { useUpdateResource } from "~/hooks/resources";
import ResourceStatusChip from "~/components/resource/status-chip";

type Props = {
  status: Resource["status"];
};

const RESOURCE_STATUS = ["draft", "published"] as const;

export default function ResourceStatus({ status }: Props) {
  const { id } = useParams<{ id: string }>();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  const { mutateAsync: updateResource } = useUpdateResource();

  const queryClient = useQueryClient();
  const resource = queryClient.getQueryData<Resource>(["resources", id]);

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
                {RESOURCE_STATUS.map((status, index) => {
                  if (resource?.status === status) return;
                  return (
                    <button
                      key={index}
                      onClick={async () => {
                        if (id) {
                          handleClose();
                          await updateResource({
                            id,
                            data: { status },
                          });
                        }
                      }}
                    >
                      <ResourceStatusChip status={status} />
                    </button>
                  );
                })}
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
