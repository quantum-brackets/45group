import StaticCard from "~/components/static-card";

//? Calabar - Event 45
import CalabarEvent451 from "~/assets/images/events/calabar/event-45/img_1368.jpg";
import CalabarEvent452 from "~/assets/images/events/calabar/event-45/img_1375.jpg";
import CalabarEvent453 from "~/assets/images/events/calabar/event-45/img_1378.jpg";
import CalabarEvent454 from "~/assets/images/events/calabar/event-45/img_1387.jpg";
import CalabarEvent455 from "~/assets/images/events/calabar/event-45/img_1394.jpg";
import CalabarEvent456 from "~/assets/images/events/calabar/event-45/img_1398.jpg";
import CalabarEvent457 from "~/assets/images/events/calabar/event-45/img_1399.jpg";
import CalabarEvent458 from "~/assets/images/events/calabar/event-45/img_1408.jpg";
import CalabarEvent459 from "~/assets/images/events/calabar/event-45/img_1423.jpg";
import CalabarEvent4510 from "~/assets/images/events/calabar/event-45/img_1449.jpg";
import CalabarEvent4511 from "~/assets/images/events/calabar/event-45/img_1476.jpg";

//? Calabar - Hotel 45
import CalabarHotel451 from "~/assets/images/events/calabar/hotel-45/DSCF3397JPG.jpg";
import CalabarHotel452 from "~/assets/images/events/calabar/hotel-45/DSCF3398JPG.jpg";
import CalabarHotel453 from "~/assets/images/events/calabar/hotel-45/DSCF3399JPG.jpg";
import CalabarHotel454 from "~/assets/images/events/calabar/hotel-45/DSCF3400JPG.jpg";
import CalabarHotel455 from "~/assets/images/events/calabar/hotel-45/IMG_1534.jpg";
import CalabarHotel456 from "~/assets/images/events/calabar/hotel-45/IMG_1537.jpg";
import CalabarHotel457 from "~/assets/images/events/calabar/hotel-45/IMG_1545.jpg";
import CalabarHotel458 from "~/assets/images/events/calabar/hotel-45/conference3JPG.jpg";

//? Ikom - Event Hall
import IkomEventHall1 from "~/assets/images/events/ikom/event-hall/img_9547.jpg";
import IkomEventHall2 from "~/assets/images/events/ikom/event-hall/img_9551.jpg";
import IkomEventHall3 from "~/assets/images/events/ikom/event-hall/img_9561.jpg";
import IkomEventHall4 from "~/assets/images/events/ikom/event-hall/img_9847.jpg";
import IkomEventHall5 from "~/assets/images/events/ikom/event-hall/img_9854.jpg";

const lodges = [
  {
    images: [
      CalabarEvent451,
      CalabarEvent452,
      CalabarEvent453,
      CalabarEvent454,
      CalabarEvent455,
      CalabarEvent456,
      CalabarEvent457,
      CalabarEvent458,
      CalabarEvent459,
      CalabarEvent4510,
      CalabarEvent4511,
    ],
    link: "/booking?type=events&city=calabar",
    name: "Event 45",
    location: "Calabar",
  },
  {
    images: [
      CalabarHotel451,
      CalabarHotel452,
      CalabarHotel453,
      CalabarHotel454,
      CalabarHotel455,
      CalabarHotel456,
      CalabarHotel457,
      CalabarHotel458,
    ],
    link: "/booking?type=events&city=calabar",
    name: "Hotel 45",
    location: "Calabar",
  },
  {
    images: [IkomEventHall1, IkomEventHall2, IkomEventHall3, IkomEventHall4, IkomEventHall5],
    link: "/booking?type=events&city=ikom",
    name: "Event Hall",
    location: "Ikom",
  },
];

export default function Events() {
  return (
    <div className="flex w-full flex-col gap-12 p-12 largeMobile:pt-10 tablet:px-4">
      <header className="flex flex-col items-center gap-10 largeMobile:gap-6">
        <h1 className="text-3xl largeMobile:text-2xl">Events</h1>
        <p className="text-center text-sm largeMobile:text-xs">
          45Group stands as your premier gateway to a world of unforgettable experiences,
          meticulously hosting an array of captivating events across a diverse range of stunning
          locations, from pristine beaches to majestic mountain retreats. Immerse yourself in
          carefully curated, unique moments that not only captivate your senses but also linger in
          your mind long after the experience has ended, weaving a tapestry of vivid memories that
          will resonate throughout your lifetime and inspire your future adventures.
        </p>
      </header>
      <main className="grid grid-cols-3 gap-16 largeMobile:!grid-cols-1 tablet_768:!gap-y-8 tablet_768:!pl-0 tablet:gap-12 tablet:px-7 largeTabletAndBelow:grid-cols-2 [@media(max-width:500px)]:!grid-cols-1">
        {lodges.map((lodge, index) => (
          <StaticCard {...lodge} key={index} />
        ))}
      </main>
    </div>
  );
}
