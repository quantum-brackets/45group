import Image from "next/image";
import Link from "next/link";
import SectionWrapper from "~/components/home/section-wrapper";
import EventImage from "~/assets/images/events/calabar/event-45/img_1375.jpg";
import CuisineImage from "~/assets/images/cuisines/abuja/guest-45/dji_0358.jpg";
import LodgeImage from "~/assets/images/lodges/ikom/hotel-45/img_9742.jpg";

export default function Events() {
  return (
    <SectionWrapper
      title="Events"
      href="/events"
      subtitle="45Group is your gateway to unforgettable experiences. Enjoy unique moments that create lasting memories."
    >
      <main className="grid grid-cols-2 gap-6 largeMobile:!gap-2 tablet_768:gap-4 largeLaptop:gap-10">
        <Link
          href={"/booking?type=events"}
          className="relative max-h-[800px] w-full overflow-hidden rounded-xl"
        >
          <Image src={EventImage} alt="Image of an event" className="h-full w-full object-cover" />
          <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
        </Link>
        <div className="flex flex-col gap-8 self-end largeMobile:gap-2 largeLaptop:gap-10">
          <p className="text-sm largeMobile:!text-[0.5rem] largeMobile:!leading-[12px] tablet:text-xs">
            Hosting events across a variety of stunning locations. Immerse yourself in unique
            moments that linger in your mind, creating memories that will last a lifetime.
          </p>
          <div className="grid grid-cols-2 gap-6 largeMobile:!gap-2 tablet_768:gap-4 largeLaptop:gap-10">
            <Link
              href={"/booking?type=events"}
              className="relative max-h-[600px] overflow-hidden rounded-lg"
            >
              <Image
                src={CuisineImage}
                alt="Image of an cuisine"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </Link>
            <Link
              href={"/booking?type=events"}
              className="relative max-h-[600px] overflow-hidden rounded-lg"
            >
              <Image
                src={LodgeImage}
                alt="Image of an lodge"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </Link>
          </div>
        </div>
      </main>
    </SectionWrapper>
  );
}
