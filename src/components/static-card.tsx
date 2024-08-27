import Image, { StaticImageData } from "next/image";
import Link from "next/link";

type Props = {
  name: string;
  link: string;
  location: string;
  images: string[] | StaticImageData[];
};

export default function StaticCard({ name, location, images, link }: Props) {
  return (
    <Link href={link} className="flex flex-col items-center gap-12 tablet_768:gap-8">
      <figure className="relative aspect-video w-full">
        <div className="relative w-full overflow-hidden rounded-md largeLaptop:rounded-xl">
          <Image src={images[0]} alt={name} className="h-full w-full object-cover" />
          <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
        </div>
        <div className="absolute -bottom-4 -right-4 -z-[1] h-full w-full rounded-md bg-black/25 tablet_768:!-bottom-2.5 tablet_768:!-right-2.5 largeLaptop:rounded-xl" />
        <div className="absolute -bottom-8 -right-8 -z-[2] h-full w-full rounded-md bg-black/15 tablet_768:!-bottom-5 tablet_768:!-right-5 largeLaptop:rounded-xl" />
      </figure>
      <div className="flex flex-col items-center gap-1">
        <h5 className="text-sm largeMobile:text-xs largeMobile:font-semibold largeLaptop:text-lg">
          {name}
        </h5>
        <small className="text-xs largeMobile:text-xs largeLaptop:text-base">{location}</small>
      </div>
    </Link>
  );
}
