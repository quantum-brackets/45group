"use client";

import { useState } from "react";
import { ClickAwayListener, Fade, Paper, Popper } from "@mui/material";
import { FaAngleDown } from "react-icons/fa6";
import Button from "~/components/button";
import useAppStore from "~/store/app";
import { cn } from "~/utils/helpers";

export default function Currency() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { currency, changeCurrency } = useAppStore();

  const open = Boolean(anchorEl);

  function onClose() {
    setAnchorEl(null);
  }

  // const currentCurrency = useMemo(() => {
  //   return "ngn" || DEFAULT_CURRENCY_CODE;
  // }, []);

  return (
    <ClickAwayListener onClickAway={onClose}>
      <div className="w-fit">
        <button
          onClick={(e) => (open ? setAnchorEl(null) : setAnchorEl(e.currentTarget))}
          className="flex w-fit items-center gap-2"
        >
          <div className="w-fit text-nowrap text-sm font-medium uppercase">{currency}</div>
          <FaAngleDown
            className={cn("text-zinc-800", {
              "rotate-180": open,
            })}
          />
        </button>
        <Popper
          open={open}
          anchorEl={anchorEl}
          transition
          slotProps={{
            root: {
              className: "z-30",
            },
          }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper className={"flex flex-col"}>
                {["ngn", "usd"].map((region, index) => (
                  <Button
                    variant="text"
                    color={currency === region ? "primary" : "info"}
                    key={index}
                    className="!rounded-none p-4 !uppercase"
                    onClick={async () => {
                      changeCurrency(region);
                      onClose();
                      window.location.reload();
                    }}
                  >
                    {region}
                  </Button>
                ))}
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
