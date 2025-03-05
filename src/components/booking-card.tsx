import Image from "next/image";
import Link from "next/link";
import { Resource } from "~/db/schemas";
import ResourceTypeChip from "./resource/type-chip";

type Props = {
  booking: Resource;
};

export default function BookingCard({
  booking: { name, handle, thumbnail, description, type },
}: Props) {
  return (
    <Link className="flex gap-4 rounded-lg border p-4" href={"/booking/" + handle}>
      <figure className="relative size-[10rem] overflow-hidden rounded-md border">
        <Image
          alt={name}
          src={thumbnail}
          priority={true}
          sizes="100%"
          fill
          className="absolute h-full w-full object-cover"
        />
      </figure>
      <div className="flex flex-col gap-2">
        <h5 className="text-base font-semibold">{name}</h5>
        <ResourceTypeChip type={type} className="!justify-start [&_svg]:!m-0" />
        <small>{description}</small>
      </div>
    </Link>
  );
}
