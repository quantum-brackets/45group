import Image from "next/image";
import { convertToLocale } from "~/utils/helpers";

type Props = {
  booking: Booking;
};

export default function BookingCard({ booking: { images, name, amount } }: Props) {
  return (
    <div className="flex rounded-lg border p-4">
      <div>
        <figure className="relative aspect-square">
          {images.slice(0, 3).map((image, index) => (
            <Image
              key={index}
              alt={`${name} image ${index + 1}`}
              src={image}
              priority={true}
              width={150}
              height={150}
              className="absolute h-full w-full object-cover"
            />
          ))}
        </figure>
      </div>
      <div>
        <h5>{name}</h5>
      </div>
      <div className="flex flex-col">
        <div>
          <h3>
            {convertToLocale({
              amount,
            })}
          </h3>
          <p>per night</p>
        </div>
      </div>
    </div>
  );
}
