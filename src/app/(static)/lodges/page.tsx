import StaticCard from "~/components/static-card";
import Lodge1 from "~/assets/images/home/lodges/lodge-1.jpg";
import Lodge2 from "~/assets/images/home/lodges/lodge-2.jpg";
import Lodge3 from "~/assets/images/home/lodges/lodge-3.jpg";
import Lodge4 from "~/assets/images/home/lodges/lodge-4.jpg";

const lodges = [
  {
    images: [Lodge1, Lodge2, Lodge3, Lodge4],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [Lodge1, Lodge2, Lodge3, Lodge4],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [Lodge1, Lodge2, Lodge3, Lodge4],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
];

export default function Lodges() {
  return (
    <div className="flex w-full flex-col gap-12 p-12 largeMobile:pt-10 tablet:px-4">
      <header className="flex flex-col items-center gap-10 largeMobile:gap-6">
        <h1 className="text-3xl largeMobile:text-2xl">Lodges</h1>
        <p className="text-center text-sm largeMobile:text-xs">
          Embark on your next unforgettable adventure at Loges Location, where breathtaking
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
