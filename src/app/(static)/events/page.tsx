import StaticCard from "~/components/static-card";
import BirthdayParty from "~/assets/images/home/events/birthday-party.jpg";
import FlowerOnTable from "~/assets/images/home/events/flower-on-table.jpg";
import TableOnBeach from "~/assets/images/home/events/table-on-beach.jpg";

const lodges = [
  {
    images: [BirthdayParty, FlowerOnTable, TableOnBeach],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [BirthdayParty, FlowerOnTable, TableOnBeach],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
  {
    images: [BirthdayParty, FlowerOnTable, TableOnBeach],
    link: "/evergreen-oasis",
    name: "Evergreen Oasis",
    location: "Abuja Municipal",
  },
];

export default function Lodges() {
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
      <main className="grid grid-cols-3 gap-16 largeMobile:!grid-cols-1 tablet_768:!gap-y-8 tablet_768:!pl-0 tablet:gap-12 tablet:px-4 largeTabletAndBelow:grid-cols-2 [@media(max-width:500px)]:!grid-cols-1">
        {lodges.map((lodge, index) => (
          <StaticCard {...lodge} key={index} />
        ))}
      </main>
    </div>
  );
}
