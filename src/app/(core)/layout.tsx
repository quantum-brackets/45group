import { ReactNode } from "react";
import Link from "next/link";
import Logo from "~/components/logo";
import Currency from "~/modules/core-layout/currency";
import Account from "~/modules/core-layout/account";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-1.5 border-zinc-300/60">
        <div className="mx-auto flex max-w-App items-center justify-between p-4 py-1">
          <Link href={"/"}>
            <Logo className="!w-[3rem]" />
          </Link>
          <div className="flex items-center gap-8">
            <Currency />
            <Account />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
