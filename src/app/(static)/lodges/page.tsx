import StaticCard from "~/components/static-card";

//? Abuja - Guest 45
import AbujaGuest45Lodge1 from "~/assets/images/lodges/abuja/guest-45/DSC7856.jpg";
import AbujaGuest45Lodge2 from "~/assets/images/lodges/abuja/guest-45/DSC7877.jpg";
import AbujaGuest45Lodge3 from "~/assets/images/lodges/abuja/guest-45/DSC7898.jpg";
import AbujaGuest45Lodge4 from "~/assets/images/lodges/abuja/guest-45/DSC7942.jpg";
import AbujaGuest45Lodge5 from "~/assets/images/lodges/abuja/guest-45/DSC7976.jpg";
import AbujaGuest45Lodge6 from "~/assets/images/lodges/abuja/guest-45/DSC8017.jpg";
import AbujaGuest45Lodge7 from "~/assets/images/lodges/abuja/guest-45/DSC8090.jpg";

//? Calabar - Hotel 45
import CalabarHotel45Lodge1 from "~/assets/images/lodges/calabar/hotel-45/bathpent.jpg";
import CalabarHotel45Lodge2 from "~/assets/images/lodges/calabar/hotel-45/img_0468.jpg";
import CalabarHotel45Lodge3 from "~/assets/images/lodges/calabar/hotel-45/img_0473.jpg";
import CalabarHotel45Lodge4 from "~/assets/images/lodges/calabar/hotel-45/img_0604.jpg";
import CalabarHotel45Lodge5 from "~/assets/images/lodges/calabar/hotel-45/img_0663.jpg";
import CalabarHotel45Lodge6 from "~/assets/images/lodges/calabar/hotel-45/img_0720.jpg";
import CalabarHotel45Lodge7 from "~/assets/images/lodges/calabar/hotel-45/img_0798.jpg";
import CalabarHotel45Lodge8 from "~/assets/images/lodges/calabar/hotel-45/img_0804.jpg";
import CalabarHotel45Lodge9 from "~/assets/images/lodges/calabar/hotel-45/img_0894.jpg";
import CalabarHotel45Lodge10 from "~/assets/images/lodges/calabar/hotel-45/img_1002.jpg";

//? Ikom - Hotel 45
import IkomHotel45Lodge1 from "~/assets/images/lodges/ikom/hotel-45/img_0343.jpg";
import IkomHotel45Lodge2 from "~/assets/images/lodges/ikom/hotel-45/img_9096.jpg";
import IkomHotel45Lodge3 from "~/assets/images/lodges/ikom/hotel-45/img_9366.jpg";
import IkomHotel45Lodge4 from "~/assets/images/lodges/ikom/hotel-45/img_9507.jpg";
import IkomHotel45Lodge5 from "~/assets/images/lodges/ikom/hotel-45/img_9582.jpg";
import IkomHotel45Lodge6 from "~/assets/images/lodges/ikom/hotel-45/img_9730.jpg";
import IkomHotel45Lodge7 from "~/assets/images/lodges/ikom/hotel-45/img_9742.jpg";
import IkomHotel45Lodge8 from "~/assets/images/lodges/ikom/hotel-45/img_9819.jpg";

const lodges = [
  {
    images: [
      AbujaGuest45Lodge1,
      AbujaGuest45Lodge2,
      AbujaGuest45Lodge3,
      AbujaGuest45Lodge4,
      AbujaGuest45Lodge5,
      AbujaGuest45Lodge6,
      AbujaGuest45Lodge7,
    ],
    link: "/booking?type=rooms&city=abuja",
    name: "Guest 45",
    location: "Abuja",
  },
  {
    images: [
      CalabarHotel45Lodge1,
      CalabarHotel45Lodge2,
      CalabarHotel45Lodge3,
      CalabarHotel45Lodge4,
      CalabarHotel45Lodge5,
      CalabarHotel45Lodge6,
      CalabarHotel45Lodge7,
      CalabarHotel45Lodge8,
      CalabarHotel45Lodge9,
      CalabarHotel45Lodge10,
    ],
    link: "/booking?type=rooms&city=calabar",
    name: "Hotel 45",
    location: "Calabar",
  },
  {
    images: [
      IkomHotel45Lodge5,
      IkomHotel45Lodge1,
      IkomHotel45Lodge2,
      IkomHotel45Lodge3,
      IkomHotel45Lodge4,
      IkomHotel45Lodge6,
      IkomHotel45Lodge7,
      IkomHotel45Lodge8,
    ],
    link: "/booking?type=rooms&city=ikom",
    name: "Hotel 45",
    location: "Ikom",
  },
];

export default function Lodges() {
  return (
    <div className="flex w-full flex-col gap-12 p-12 largeMobile:pt-10 tablet:px-4">
      <header className="flex flex-col items-center gap-10 largeMobile:gap-6">
        <h1 className="text-3xl largeMobile:text-2xl">Lodges</h1>
        <p className="text-center text-sm largeMobile:text-xs">
          Embark on your next unforgettable adventure at Lodges Location, where breathtaking
          landscapes and thrilling experiences await to inspire your wanderlust, create lasting
          memories, and offer you the perfect backdrop for exploration and discovery in the great
          outdoors.
        </p>
      </header>
      <main className="grid grid-cols-3 gap-16 largeMobile:!grid-cols-1 tablet_768:!gap-y-8 tablet_768:!pl-0 tablet:gap-12 tablet:px-4 largeTabletAndBelow:grid-cols-2 [@media(max-width:500px)]:!grid-cols-1">
        {lodges.map((lodge, index) => (
          <StaticCard {...lodge} key={index} />
        ))}
      </main>
    </div>
  );
}
