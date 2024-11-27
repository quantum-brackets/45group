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
