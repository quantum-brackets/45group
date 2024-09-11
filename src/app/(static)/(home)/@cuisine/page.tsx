import SectionWrapper from "~/components/home/section-wrapper";
import StaticCard from "~/components/static-card";

//? Abuja - Guest 45
import AbujaGuest451 from "~/assets/images/cuisines/abuja/guest-45/dji_0345.jpg";
import AbujaGuest452 from "~/assets/images/cuisines/abuja/guest-45/dji_0349.jpg";
import AbujaGuest453 from "~/assets/images/cuisines/abuja/guest-45/dji_0358.jpg";
import AbujaGuest454 from "~/assets/images/cuisines/abuja/guest-45/dji_0362.jpg";

//? Calabar - Resturant 45
import CalabarResturant451 from "~/assets/images/cuisines/calabar/resturant-45/img_1048.jpg";
import CalabarResturant452 from "~/assets/images/cuisines/calabar/resturant-45/img_1258.jpg";
import CalabarResturant453 from "~/assets/images/cuisines/calabar/resturant-45/img_1268.jpg";
import CalabarResturant454 from "~/assets/images/cuisines/calabar/resturant-45/img_1272.jpg";
import CalabarResturant455 from "~/assets/images/cuisines/calabar/resturant-45/img_1285.jpg";
import CalabarResturant456 from "~/assets/images/cuisines/calabar/resturant-45/img_1321.jpg";
import CalabarResturant457 from "~/assets/images/cuisines/calabar/resturant-45/img_1328.jpg";

//? Ikom - Pool Bar
import IkomPoolBar1 from "~/assets/images/cuisines/ikom/pool-bar/img_0031.jpg";
import IkomPoolBar2 from "~/assets/images/cuisines/ikom/pool-bar/img_0043.jpg";
import IkomPoolBar3 from "~/assets/images/cuisines/ikom/pool-bar/img_0068.jpg";
import IkomPoolBar4 from "~/assets/images/cuisines/ikom/pool-bar/img_0277.jpg";
import IkomPoolBar5 from "~/assets/images/cuisines/ikom/pool-bar/img_0372.jpg";
import IkomPoolBar6 from "~/assets/images/cuisines/ikom/pool-bar/img_9086.jpg";
import IkomPoolBar7 from "~/assets/images/cuisines/ikom/pool-bar/img_9987.jpg";

const cuisines = [
  {
    images: [AbujaGuest451, AbujaGuest452, AbujaGuest453, AbujaGuest454],
    link: "/booking?type=dining&city=abuja",
    name: "Guest 45",
    location: "Abuja",
  },
  {
    images: [
      CalabarResturant451,
      CalabarResturant452,
      CalabarResturant453,
      CalabarResturant454,
      CalabarResturant455,
      CalabarResturant456,
      CalabarResturant457,
    ],
    link: "/booking?type=dining&city=calabar",
    name: "Resturant 45",
    location: "Calabar",
  },
  {
    images: [
      IkomPoolBar1,
      IkomPoolBar2,
      IkomPoolBar3,
      IkomPoolBar4,
      IkomPoolBar5,
      IkomPoolBar6,
      IkomPoolBar7,
    ],
    link: "/booking?type=dining&city=ikom",
    name: "Resturant/Pool Bar",
    location: "Ikom",
  },
];

export default function Cuisine() {
  return (
    <SectionWrapper title="Cuisine" subtitle="Elevate Your Palate with Every Bite!">
      <main className="grid grid-cols-3 gap-16 largeMobile:!grid-cols-1 tablet_768:!gap-y-8 tablet_768:!pl-0 tablet:gap-12 tablet:px-4 largeTabletAndBelow:grid-cols-2 [@media(max-width:500px)]:!grid-cols-1">
        {cuisines.map((cuisine, index) => (
          <StaticCard {...cuisine} key={index} />
        ))}
      </main>
    </SectionWrapper>
  );
}
