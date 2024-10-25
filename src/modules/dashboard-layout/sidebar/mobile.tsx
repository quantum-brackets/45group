"use client";

import Image from "next/image";
import { Drawer, IconButton } from "@mui/material";
import SideBarLinks from "./links";
import MenuIcon from "~/assets/icons/menu.svg";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileSidebar({ open, onClose }: Props) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose} closeAfterTransition>
      <aside className="relative w-[250px] px-4 pb-8 pt-20">
        <IconButton className="!absolute !left-[14px] !top-[14px] w-fit" onClick={onClose}>
          <Image src={MenuIcon} width={22} height={22} alt="menu icon" className="-scale-x-[1]" />
        </IconButton>
        <div className="mt-4">
          <SideBarLinks />
        </div>
      </aside>
    </Drawer>
  );
}
