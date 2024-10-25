"use client";

import SidebarLinks from "./links";
import MobileSidebar from "./mobile";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar(props: Props) {
  return (
    <>
      <aside className="w-full max-w-[250px] flex-grow border-r p-4 pt-8 tablet:hidden largeLaptop:max-w-[300px]">
        <SidebarLinks />
      </aside>
      <MobileSidebar {...props} />
    </>
  );
}
