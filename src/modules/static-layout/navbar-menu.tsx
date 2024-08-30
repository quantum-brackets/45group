"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer, IconButton } from "@mui/material";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import Logo from "~/components/logo";
import { cn } from "~/utils/helpers";

const links = [
  {
    href: "/lodges",
    text: "Lodges",
  },
  {
    href: "/events",
    text: "Events",
  },
  {
    href: "/cuisines",
    text: "Cuisines",
  },
  {
    href: "/about",
    text: "About",
  },
];

export default function NavbarMenu() {
  const [open, setOpen] = useState(false);

  const pathname = usePathname();

  function closeDrawer() {
    setOpen(false);
  }

  return (
    <>
      <button className="hidden tablet_768:block" onClick={() => setOpen((prev) => !prev)}>
        <HiOutlineMenuAlt2 className="text-2xl" />
      </button>
      <Drawer
        open={open}
        onClose={closeDrawer}
        className="hidden tablet_768:block"
        PaperProps={{
          className: "w-[250px]",
        }}
      >
        <aside className="relative flex flex-col items-center gap-12 p-8 px-6 !pt-20">
          <Link href={"/"} className="w-fit">
            <Logo className="w-[3rem]" />
          </Link>
          <IconButton className="!absolute right-[16px] top-[26px] w-fit" onClick={closeDrawer}>
            <IoClose className="!text-zinc-700" />
          </IconButton>
          <ul className="flex flex-col items-center gap-8 tablet:gap-6 largeLaptop:gap-12">
            {links.map(({ href, text }, index) => (
              <li key={index}>
                <Link
                  href={href}
                  className={cn("text-sm hover:underline", {
                    underline: pathname === href,
                  })}
                  onClick={closeDrawer}
                >
                  {text}
                </Link>
              </li>
            ))}
            <li>
              <Link href={"/#contact"} onClick={closeDrawer} className="text-sm hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </aside>
      </Drawer>
    </>
  );
}
