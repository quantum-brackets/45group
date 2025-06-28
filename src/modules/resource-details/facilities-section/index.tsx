"use client";

import { useMemo, useState } from "react";
import { ClickAwayListener, Fade, IconButton, Paper, Popper } from "@mui/material";
import { GoKebabHorizontal } from "react-icons/go";
import { Resource } from "~/db/schemas";
import { cn } from "~/utils/helpers";
// import EditModal from "./edit-modal";

type Props = {
  resource: Resource;
};

export default function FacilitiesSection({ resource }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const handleClick = (target: HTMLButtonElement) => setAnchorEl(target);
  const handleClose = () => setAnchorEl(null);

  const houseRules = useMemo(
    () => resource.rules?.filter(({ rule }) => rule.category === "house_rules"),
    [resource.rules]
  );
  const cancellationRules = useMemo(
    () => resource.rules?.filter(({ rule }) => rule.category === "cancellations"),
    [resource.rules]
  );

  return (
    <section className="flex h-fit w-full flex-col gap-4 rounded-md border bg-zinc-50 p-4 tablet:max-w-none largeLaptop:p-6">
      <header className="flex items-center justify-between gap-8">
        <h5 className="text-lg font-medium">Rules</h5>
        <ClickAwayListener onClickAway={handleClose}>
          <div>
            <IconButton
              size="small"
              onClick={(e) => (isOpen ? handleClose() : handleClick(e.currentTarget))}
            >
              <GoKebabHorizontal className="text-black" />
            </IconButton>
            <Popper open={isOpen} anchorEl={anchorEl}>
              {({ TransitionProps }) => (
                <Fade {...TransitionProps}>
                  <Paper>{/* <EditModal /> */}</Paper>
                </Fade>
              )}
            </Popper>
          </div>
        </ClickAwayListener>
      </header>
      <main className={cn("flex flex-col gap-3")}>
        <h5 className="text-sm">House Rules</h5>
        {houseRules?.length ? (
          houseRules.map(({ rule: { name, description, id } }) => (
            <div key={id} className="flex flex-col gap-1">
              <small>{name}</small>
              {description && <small>{description}</small>}
            </div>
          ))
        ) : (
          <div className="flex h-16 items-center justify-center">
            <small>No rules found</small>
          </div>
        )}
      </main>
    </section>
  );
}
