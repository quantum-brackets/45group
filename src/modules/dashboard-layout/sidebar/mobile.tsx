"use client";

import { Drawer, IconButton } from "@mui/material";
import { IoMenu } from "react-icons/io5";
import SideBarLinks from "./links";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileSidebar({ open, onClose }: Props) {
  return (
    <Drawer anchor="left" open={open} onClose={onClose} closeAfterTransition>
      <aside className="relative w-[350px] px-4 pb-8 pt-20 mediumMobile:!w-[250px] largeMobile:w-[290px] [@media(min-width:768px)]:hidden">
        <IconButton className="!absolute !left-[16px] !top-[16px] w-fit" onClick={onClose}>
          <IoMenu className="text-2xl text-zinc-700" />
        </IconButton>
        <div className="mt-4">
          <SideBarLinks />
        </div>
      </aside>
    </Drawer>
  );
}
