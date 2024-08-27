import { ReactNode } from "react";
import Link from "next/link";
import { FaSquareXTwitter, FaInstagram, FaFacebook } from "react-icons/fa6";
import Logo from "~/components/logo";
import Button from "~/components/button";
import NavbarMenu from "~/modules/static-layout/navbar-menu";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="flex w-full max-w-App items-center justify-between gap-8 p-4 px-8 largeMobile:px-4">
        <div className="flex items-center gap-8 largeMobile:gap-4">
          <NavbarMenu />
          <Link href={"/"}>
            <Logo className="w-[3rem] largeMobile:w-[2.5rem]" />
          </Link>
        </div>
        <div className="flex items-center justify-between gap-24 tablet:gap-12 largeLaptop:gap-44">
          <ul className="flex gap-8 tablet_768:hidden tablet:gap-6 largeLaptop:gap-12">
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
          <Button>Reserve</Button>
        </div>
      </header>
      <main className="flex w-full flex-grow justify-center">{children}</main>
      <footer className="flex w-full max-w-App justify-between gap-8 p-4 px-8 pr-16 largeMobile:px-4">
        <Link href={"/"}>
          <Logo className="w-[2.5rem]" />
        </Link>
        <div className="flex items-center gap-8 largeMobile:gap-4">
          <Link href={""}>
            <FaSquareXTwitter className="text-xl text-zinc-700" />
          </Link>
          <Link href={""}>
            <FaInstagram className="text-xl text-zinc-700" />
          </Link>
          <Link href={""}>
            <FaFacebook className="text-xl text-zinc-700" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
