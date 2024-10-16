"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BsPerson } from "react-icons/bs";
import { LiaBookSolid } from "react-icons/lia";
import { IoReceiptOutline, IoSettingsOutline } from "react-icons/io5";
import { cn } from "~/utils/helpers";

const links = [
  {
    title: "Bookings",
    href: "/bookings",
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
    href: "/settings",
    icon: IoSettingsOutline,
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-grow">
      <aside className="w-full max-w-[250px] flex-grow border-r p-4 pt-8 largeLaptop:max-w-[300px]">
        <div className="flex flex-col gap-4">
          <small className="text-xs font-bold">Menu</small>
          <div className="flex flex-col gap-2">
            {links.map(({ href, title, icon: Icon }, index) => (
              <Link
                href={href}
                key={index}
                className={cn("flex items-center gap-4 rounded p-2 px-4", {
                  "hover: bg-primary text-white": pathname === href,
                  "hover:bg-zinc-100": pathname !== href,
                })}
              >
                <Icon className="text-base largeLaptop:text-lg" />
                <span className="text-[0.85rem] largeLaptop:text-base">{title}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>
      <main className="w-full p-4">{children}</main>
    </div>
  );
}
