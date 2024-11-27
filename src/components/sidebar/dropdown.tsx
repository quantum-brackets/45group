"use client";

import { useState } from "react";
import Link from "next/link";
import { Collapse } from "@mui/material";
import { cn } from "~/utils/helpers";
import { IconType } from "react-icons/lib";
import { FaAngleDown } from "react-icons/fa6";

type Props = {
  pathname: string;
  title: string;
  subLinks: {
    title: string;
    href: string;
  }[];
  Icon: IconType;
};

export default function SidebarDropdown({ title, subLinks, Icon, pathname }: Props) {
  const [openLinks, toggleDropdown] = useState(
    subLinks.find((link) => link.href === pathname) ? true : false
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        onClick={() => (openLinks ? toggleDropdown(false) : toggleDropdown(true))}
        className={
          "flex w-full items-center justify-between gap-4 rounded p-3 px-4 hover:bg-zinc-100"
        }
      >
        <div className="flex items-center gap-4">
          <Icon className="text-base largeLaptop:text-lg" />
          <span className="text-[0.85rem] largeLaptop:text-base">{title}</span>
        </div>
        <FaAngleDown
          className={cn("ml-auto", {
            "rotate-180": openLinks,
          })}
        />
      </button>
      <Collapse in={openLinks} timeout="auto">
        <div className="pl-4">
          {subLinks.map(({ title, href }, index) => (
            <Link
              key={index}
              href={href}
              className={cn("flex items-center gap-4 rounded p-3 px-4", {
                "hover: bg-primary text-white": pathname === href,
                "hover:bg-zinc-100": pathname !== href,
              })}
            >
              <span className="text-xs largeLaptop:text-sm">{title}</span>
            </Link>
          ))}
        </div>
      </Collapse>
    </div>
  );
}
