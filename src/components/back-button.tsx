"use client";

import { useRouter } from "next/navigation";
import nProgress from "nprogress";
import { IoIosArrowRoundBack } from "react-icons/io";

type Props = {
  text: string;
  href: string;
};

export default function BackButton({ text, href }: Props) {
  const router = useRouter();

  return (
    <button
      className="flex w-fit items-center gap-1 text-zinc-600"
      onClick={() => {
        nProgress.start();
        router.push(href);
      }}
    >
      <IoIosArrowRoundBack className="stroke-[3] text-2xl" />
      <small className="font-medium">{text}</small>
    </button>
  );
}
