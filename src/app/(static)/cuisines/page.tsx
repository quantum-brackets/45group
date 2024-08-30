import StaticCard from "~/components/static-card";
import Beef from "~/assets/images/home/cuisines/beef.jpg";
import Sushi from "~/assets/images/home/cuisines/sushi.jpg";
import Omelette from "~/assets/images/home/cuisines/omelette.jpg";

const cuisines = [
  {
    images: [Beef, Sushi, Omelette],
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
  {
    images: [Beef, Sushi, Omelette],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
];

export default function Cuisines() {
  return (
    <div className="flex w-full flex-col gap-12 p-12 largeMobile:pt-10 tablet:px-4">
      <header className="flex flex-col items-center gap-10 largeMobile:gap-6">
        <h1 className="text-3xl largeMobile:text-2xl">Cuisines</h1>
        <p className="text-center text-sm largeMobile:text-xs">
          Embark on a culinary journey where the rich traditions of the past meet the bold
          innovations of the present. Every dish is a masterful creation, telling a unique story of
          flavor, passion, and craftsmanship. From the first bite to the last, experience a symphony
          of tastes that celebrates both the heritage and the artistry of fine cuisine.
        </p>
      </header>
      <main className="grid grid-cols-3 gap-16 largeMobile:!grid-cols-1 tablet_768:!gap-y-8 tablet_768:!pl-0 tablet:gap-12 tablet:px-4 largeTabletAndBelow:grid-cols-2 [@media(max-width:500px)]:!grid-cols-1">
        {cuisines.map((cuisine, index) => (
          <StaticCard {...cuisine} key={index} />
        ))}
      </main>
    </div>
  );
}
