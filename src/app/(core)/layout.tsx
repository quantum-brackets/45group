import { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@mui/material";
import Logo from "~/components/logo";
import Currency from "~/modules/core-layout/currency";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y">
      <header className="flex items-center justify-between p-4 py-2">
        <Link href={"/"}>
          <Logo className="!w-[3rem]" />
        </Link>
        <div className="flex items-center gap-8">
          <Currency />
          <button>
            <Avatar alt="full name" sx={{ width: 35, height: 35 }} />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
