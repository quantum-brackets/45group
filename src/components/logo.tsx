import Image, { ImageProps } from "next/image";
import { cn } from "~/utils/helpers";
import _logo from "~/assets/logo.svg";

type Props = Omit<ImageProps, "src" | "alt" | "className"> & {
  className?: string;
};

export default function Logo({ className, ...props }: Props) {
  return (
    <Image
      {...props}
      src={_logo}
      alt="45Group logo"
      priority
      className={cn(`w-[4rem]`, className)}
    />
  );
}
