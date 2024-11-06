"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconButton } from "@mui/material";
import Logo from "~/components/logo";
import Currency from "~/components/layout-components/currency";
import Account from "~/components/layout-components/account";
import Sidebar from "~/modules/dashboard-layout/sidebar";
import MenuIcon from "~/assets/icons/menu.svg";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [openSidebar, setOpenSidebar] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-1.5 border-zinc-300/60">
        <div className="mx-auto flex items-center justify-between p-4 py-1">
          <div className="flex items-center gap-5">
            <IconButton className="!hidden tablet:!block" onClick={() => setOpenSidebar(true)}>
              <Image
                src={MenuIcon}
                width={22}
                height={22}
                alt="menu icon"
                className="-scale-x-[1]"
              />
            </IconButton>
            <Link href={"/"}>
              <Logo className="!w-[3rem]" />
            </Link>
          </div>
          <div className="flex items-center gap-8">
            <Currency />
            <Account />
          </div>
        </div>
      </header>
      <div className="flex flex-grow">
        <Sidebar onClose={() => setOpenSidebar(false)} open={openSidebar} />
        <main className="mx-auto w-full max-w-[1250px] p-6 tablet_768:px-4">{children}</main>
      </div>
    </div>
  );
}
