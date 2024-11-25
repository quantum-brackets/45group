"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BsPerson } from "react-icons/bs";
import { LiaBookSolid } from "react-icons/lia";
import { IoReceiptOutline, IoSettingsOutline } from "react-icons/io5";
import { cn } from "~/utils/helpers";
import SidebarDropdown from "./dropdown";

const links = [
  {
    title: "Previous Bookings",
    href: "/previous-bookings",
    icon: LiaBookSolid,
  },
  {
    title: "Receipts",
    href: "/receipts",
    icon: IoReceiptOutline,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: BsPerson,
  },
  {
    title: "Settings",
    icon: IoSettingsOutline,
    subLinks: [
      {
        title: "Account",
        href: "/account-settings",
      },
    ],
  },
];

export default function SidebarLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <small className="text-xs font-bold">Menu</small>
      <div className="flex flex-col gap-2">
        {links.map(({ href, title, icon: Icon, subLinks }, index) => {
          if (subLinks && !href) {
            return (
              <SidebarDropdown
                subLinks={subLinks}
                Icon={Icon}
                title={title}
                pathname={pathname}
                key={index}
              />
            );
          }

          return (
            <Link
              href={href}
              key={index}
              className={cn("flex items-center gap-4 rounded p-3 px-4", {
                "hover: bg-primary text-white": pathname === href,
                "hover:bg-zinc-100": pathname !== href,
              })}
            >
              <Icon className="text-base largeLaptop:text-lg" />
              <span className="text-[0.85rem] largeLaptop:text-base">{title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
