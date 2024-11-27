"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, ClickAwayListener, Collapse, Fade, Paper, Popper, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import nProgress from "nprogress";
import { FaAngleDown } from "react-icons/fa6";
import Button from "~/components/button";
import { cn } from "~/utils/helpers";
import useAppStore from "~/store/app";
import UsersService from "~/services/users";

const links = [
  {
    text: "Profile",
    href: "/profile",
  },
  {
    text: "Bookings",
    href: "/bookings",
  },
  {
    text: "Receipts",
    href: "/receipts",
  },
  {
    text: "Settings",
    open: false,
    sublink: [
      {
        text: "Account",
        href: "/account-settings",
      },
    ],
  },
];

export default function Account() {
  const router = useRouter();
  const pathname = usePathname();

  const { toggleLogoutModal } = useAppStore();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [openSublinkIndex, setOpenSublinkIndex] = useState<number | null>(null);

  const open = Boolean(anchorEl);

  const { isLoading, data: currentUser } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
    retry: false,
  });

  function onClose() {
    setAnchorEl(null);
  }

  if (isLoading) {
    return <Skeleton width={100} height={30} />;
  }

  if (!currentUser) {
    return (
      <div className="flex gap-4">
        <Button href={`/signin?from=${pathname}`}>Sign-in</Button>
      </div>
    );
  }

  return (
    <ClickAwayListener onClickAway={onClose}>
      <div>
        <button
          onClick={(e) => (anchorEl ? setAnchorEl(null) : setAnchorEl(e.currentTarget))}
          className={cn("flex items-center gap-2")}
        >
          <Avatar
            alt={`${currentUser.first_name} ${currentUser.last_name}`}
            src={currentUser.image || ""}
            sx={{ width: 35, height: 35 }}
            className={cn("border", { "!bg-primary": !currentUser.image })}
          >
            {`${currentUser.first_name?.[0]}${currentUser.last_name?.[0]}`}
          </Avatar>
          <FaAngleDown
            className={cn({
              "rotate-180": open,
            })}
          />
        </button>
        <Popper
          open={open}
          anchorEl={anchorEl}
          transition
          placement="bottom-start"
          className="!mt-4"
          slotProps={{
            root: {
              className: "z-30",
            },
          }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper>
                <div className={"popper-btn flex w-[200px] flex-col"}>
                  {links.map((link, index) => {
                    if (!link.href && !link.sublink) return null;

                    if (link.sublink) {
                      return (
                        <div key={index}>
                          <button
                            onClick={() =>
                              setOpenSublinkIndex((prev) => (prev === index ? null : index))
                            }
                            className="items-center justify-between"
                          >
                            {link.text}
                            <FaAngleDown
                              className={cn({
                                "rotate-180": openSublinkIndex === index,
                              })}
                            />
                          </button>
                          <Collapse in={openSublinkIndex === index} timeout="auto">
                            <div className="pl-4">
                              {link.sublink.map((sublink, subIndex) => (
                                <button
                                  key={subIndex}
                                  onClick={() => {
                                    nProgress.start();
                                    router.push(sublink.href);
                                    onClose();
                                  }}
                                >
                                  {sublink.text}
                                </button>
                              ))}
                            </div>
                          </Collapse>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          nProgress.start();
                          router.push(link.href);
                          onClose();
                        }}
                      >
                        {link.text}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      toggleLogoutModal(true);
                      onClose();
                    }}
                  >
                    Logout
                  </button>
                </div>
              </Paper>
            </Fade>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}
