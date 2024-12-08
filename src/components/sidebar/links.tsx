"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconType } from "react-icons/lib";
import { cn } from "~/utils/helpers";
import SidebarDropdown from "./dropdown";

export type SidebarLinksProps = {
  links: {
    title: string;
    href?: string;
    icon: IconType;
    subLinks?: {
      title: string;
      href: string;
    }[];
  }[];
};

export default function SidebarLinks({ links }: SidebarLinksProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={"/booking"}
        className="flex items-center justify-center rounded-md bg-black/5 p-3"
      >
        <small>Go to Booking</small>
      </Link>
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

          if (!href) return;

          const match = pathname.startsWith(href);

          return (
            <Link
              href={href}
              key={index}
              className={cn("flex items-center gap-4 rounded p-3 px-4", {
                "hover: bg-primary text-white": match,
                "hover:bg-zinc-100": !match,
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
