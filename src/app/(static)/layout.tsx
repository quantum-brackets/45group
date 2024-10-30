import { ReactNode } from "react";
import Link from "next/link";
import { FaSquareXTwitter, FaInstagram, FaFacebook } from "react-icons/fa6";
import Logo from "~/components/logo";
import NavbarMenu from "~/modules/static-layout/navbar-menu";
import Navbar from "~/modules/static-layout/navbar";
import Script from "next/script";

type Props = {
  children: ReactNode;
};

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
    href: "/cuisine",
    text: "Cuisine",
  },
  {
    href: "/about",
    text: "About",
  },
];

export default function Layout({ children }: Props) {
  return (
    <>
      <div className="flex min-h-screen flex-col items-center">
        <header className="flex w-full max-w-App items-center justify-between gap-8 p-4 px-8 largeMobile:px-4">
          <div className="flex items-center gap-8 largeMobile:gap-4">
            <NavbarMenu links={links} />
            <Link href={"/"}>
              <Logo className="w-[3rem] largeMobile:w-[2.5rem]" />
            </Link>
          </div>
          <Navbar links={links} />
        </header>
        <main className="flex w-full flex-grow justify-center">{children}</main>
        <footer className="flex w-full max-w-App justify-between gap-8 p-4 px-8 pr-16 largeMobile:px-4">
          <Link href={"/"}>
            <Logo className="w-[2.5rem]" />
          </Link>
          <div className="flex items-center gap-8 largeMobile:gap-4">
            <Link href={"https://x.com/hotel45ng"}>
              <FaSquareXTwitter className="text-xl text-zinc-700" />
            </Link>
            <Link href={"https://www.instagram.com/hotel45.ng"}>
              <FaInstagram className="text-xl text-zinc-700" />
            </Link>
            <Link href={"https://www.facebook.com/Hotel45.ng"}>
              <FaFacebook className="text-xl text-zinc-700" />
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
