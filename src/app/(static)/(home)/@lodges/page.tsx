import Image from "next/image";
import SectionWrapper from "~/components/home/section-wrapper";
import AbujaGuest45 from "~/assets/images/lodges/abuja/guest-45/DSC7856.jpg";
import CalabarHotel45 from "~/assets/images/lodges/calabar/hotel-45/img_0604.jpg";
import IkomHotel45 from "~/assets/images/lodges/ikom/hotel-45/img_0343.jpg";

const data = [
  {
    image: AbujaGuest45,
    location: "Abuja",
  },
  {
    image: CalabarHotel45,
    location: "Calabar",
  },
  {
    image: IkomHotel45,
    location: "Ikom",
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
            <Image src={image} alt="Image of lodge" className="h-full w-full object-cover" />
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
