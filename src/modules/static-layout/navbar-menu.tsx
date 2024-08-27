"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer, IconButton } from "@mui/material";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import Logo from "~/components/logo";

export default function NavbarMenu() {
  const [open, setOpen] = useState(false);

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
            <li>
              <Link href={"/lodges"} className="text-sm hover:underline">
                Lodges
              </Link>
            </li>
            <li>
              <Link href={"/events"} className="text-sm hover:underline">
                Events
              </Link>
            </li>
            <li>
              <Link href={"/cuisines"} className="text-sm hover:underline">
                Cuisines
              </Link>
            </li>
            <li>
              <Link href={"/about"} className="text-sm hover:underline">
                About
              </Link>
            </li>
            <li>
              <Link href={"/about"} className="text-sm hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </aside>
      </Drawer>
    </>
  );
}
