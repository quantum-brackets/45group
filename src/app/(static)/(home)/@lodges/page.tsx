import Image from "next/image";
import Link from "next/link";
import SectionWrapper from "~/components/home/section-wrapper";
import AbujaGuest45 from "~/assets/images/lodges/abuja/guest-45/DSC7856.jpg";
import CalabarHotel45 from "~/assets/images/lodges/calabar/hotel-45/img_0604.jpg";
import IkomHotel45 from "~/assets/images/lodges/ikom/hotel-45/img_9742.jpg";

const data = [
  {
    image: AbujaGuest45,
    href: "/booking?type=rooms&city=abuja",
    location: "Abuja",
  },
  {
    image: CalabarHotel45,
    href: "/booking?type=rooms&city=calabar",
    location: "Calabar",
  },
  {
    image: IkomHotel45,
    href: "/booking?type=rooms&city=ikom",
    location: "Ikom",
  },
];

export default function Lodges() {
  return (
    <SectionWrapper
      href="lodges"
      title="Lodges"
      subtitle="Find your next adventure at a 45 group location!"
    >
      <main className="grid w-full grid-flow-col gap-8 overflow-x-auto pb-2">
        {data.map(({ image, location, href }, index) => (
          <Link
            key={index}
            href={href}
            className="relative h-[600px] w-[400px] overflow-hidden rounded-xl largeMobile:!h-[450px] largeMobile:!w-[250px] tablet:h-[500px] tablet:w-[300px]"
          >
            <Image src={image} alt="Image of lodge" className="h-full w-full object-cover" />
            <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            <h1 className="absolute right-1/2 top-[50px] z-[3] translate-x-1/2 text-2xl text-white">
              {location}
            </h1>
          </Link>
        ))}
      </main>
    </SectionWrapper>
  );
}
