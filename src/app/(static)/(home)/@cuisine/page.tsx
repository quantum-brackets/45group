import SectionWrapper from "~/components/home/section-wrapper";
import StaticCard from "~/components/static-card";
import Beef from "~/assets/images/home/cuisines/beef.jpg";
import Sushi from "~/assets/images/home/cuisines/sushi.jpg";
import Omelette from "~/assets/images/home/cuisines/omelette.jpg";
import Palas from "~/assets/images/home/lodges/palas.jpg";

const cuisines = [
  {
    images: [Beef, Sushi, Omelette],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [Beef, Sushi, Omelette, Palas],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [Beef, Sushi, Omelette],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
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
