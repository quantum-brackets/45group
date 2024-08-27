import Image from "next/image";
import Palas from "~/assets/images/home/lodges/palas.jpg";
import SectionWrapper from "~/components/home/section-wrapper";

const data = [
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Lagos",
  },
  {
    image: Palas,
    location: "Ogun",
  },
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Abuja",
  },
  {
    image: Palas,
    location: "Abuja",
  },
];

export default function Lodges() {
  return (
    <SectionWrapper title="Lodges" subtitle="Find your next adventure at Lodges Location!">
      <main className="grid w-full grid-flow-col gap-8 overflow-x-auto pb-2">
        {data.map(({ image, location }, index) => (
          <div
            key={index}
            className="relative h-[600px] w-[400px] overflow-hidden rounded-xl largeMobile:!h-[450px] largeMobile:!w-[250px] tablet:h-[500px] tablet:w-[300px]"
          >
            <Image src={image} alt="Image of a palas" className="h-full w-full object-cover" />
            <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            <h1 className="absolute right-1/2 top-[50px] z-[3] translate-x-1/2 text-2xl text-white">
              {location}
            </h1>
          </div>
        ))}
      </main>
    </SectionWrapper>
  );
}
