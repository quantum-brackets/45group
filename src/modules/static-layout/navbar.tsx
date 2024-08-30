"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "~/components/button";
import { cn } from "~/utils/helpers";

type Props = {
  links: Record<"href" | "text", string>[];
};

export default function Navbar({ links }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-24 tablet:gap-12 largeLaptop:gap-44">
      <ul className="flex gap-8 tablet_768:hidden tablet:gap-6 largeLaptop:gap-12">
        {links.map(({ href, text }, index) => (
          <li key={index}>
            <Link
              href={href}
              className={cn("text-sm hover:underline", {
                underline: pathname === href,
              })}
            >
              {text}
            </Link>
          </li>
        ))}
        <li>
          <Link href={"/#contact"} className="text-sm hover:underline">
            Contact
          </Link>
        </li>
      </ul>
      <Button>Reserve</Button>
    </div>
  );
}
