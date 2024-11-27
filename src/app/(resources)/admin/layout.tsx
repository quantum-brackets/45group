"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconButton, Avatar } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { LuLayoutDashboard } from "react-icons/lu";
import { GrResources } from "react-icons/gr";
import Logo from "~/components/logo";
import Sidebar from "~/components/sidebar";
import UsersService from "~/services/users";
import MenuIcon from "~/assets/icons/menu.svg";
import { cn } from "~/utils/helpers";

const links = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LuLayoutDashboard,
  },
  {
    title: "Resources",
    href: "/admin/resources",
    icon: GrResources,
  },
];

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const [openSidebar, toggleSidebar] = useState(false);

  const { data: currentUser } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-1.5 border-zinc-300/60">
        <div className="mx-auto flex items-center justify-between p-4 py-1">
          <div className="flex items-center gap-5">
            <IconButton className="!hidden tablet:!block" onClick={() => toggleSidebar(true)}>
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
          {currentUser && (
            <div className="flex items-center gap-8">
              <Avatar
                alt={`${currentUser.first_name} ${currentUser.last_name}`}
                src={currentUser.image || ""}
                sx={{ width: 35, height: 35 }}
                className={cn("border", { "!bg-primary": !currentUser.image })}
              >
                {`${currentUser.first_name?.[0]}${currentUser.last_name?.[0]}`}
              </Avatar>
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-grow">
        <Sidebar onClose={() => toggleSidebar(false)} open={openSidebar} links={links} />
        <main className="mx-auto w-full max-w-[1250px] p-6 tablet_768:px-4">{children}</main>
      </div>
    </div>
  );
}
