import Image from "next/image";
import SectionWrapper from "~/components/home/section-wrapper";
import CalabarEvent45 from "~/assets/images/events/calabar/event-45/img_1375.jpg";
import CalabarHotel452 from "~/assets/images/events/calabar/hotel-45/DSCF3399JPG.jpg";
import IkomEventHall2 from "~/assets/images/events/ikom/event-hall/img_9561.jpg";

export default function Events() {
  return (
    <SectionWrapper
      title="Events"
      subtitle="45Group is your gateway to unforgettable experiences. Enjoy unique moments that createlasting memories."
    >
      <main className="grid grid-cols-2 gap-6 largeMobile:!gap-2 tablet_768:gap-4 largeLaptop:gap-10">
        <figure className="relative max-h-[800px] w-full overflow-hidden rounded-xl">
          <Image
            src={CalabarEvent45}
            alt="Image of an event"
            className="h-full w-full object-cover"
          />
          <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
        </figure>
        <div className="flex flex-col gap-8 self-end largeMobile:gap-2 largeLaptop:gap-10">
          <p className="text-sm largeMobile:!text-[0.5rem] largeMobile:!leading-[12px] tablet:text-xs">
            45Group is your gateway to unforgettable experiences, hosting events across a variety of
            stunning locations. Immerse yourself in unique moments that linger in your mind,
            creating memories that will last a lifetime.
          </p>
          <div className="grid grid-cols-2 gap-6 largeMobile:!gap-2 tablet_768:gap-4 largeLaptop:gap-10">
            <figure className="relative max-h-[600px] overflow-hidden rounded-lg">
              <Image
                src={CalabarHotel452}
                alt="Image of an event"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </figure>
            <figure className="relative max-h-[600px] overflow-hidden rounded-lg">
              <Image
                src={IkomEventHall2}
                alt="Image of an event"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </figure>
          </div>
        </div>
      </main>
    </SectionWrapper>
  );
}
