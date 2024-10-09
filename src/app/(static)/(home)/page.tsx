import Image from "next/image";
import Lodge from "~/assets/images/home/intro/lodges.jpg";

export default function Home() {
  return (
    <section className="relative h-[80vh] max-h-[600px] w-full">
      <Image
        src={Lodge}
        alt="Images of lodges, events and cuisine"
        priority
        className="h-full w-full object-cover"
      />
      <div className="absolute top-0 z-[2] h-full w-full bg-black/45" />
      <h1 className="absolute bottom-1/2 right-1/2 z-10 translate-x-1/2 translate-y-1/2 font-dancing_script text-4xl font-bold text-white mediumMobile:text-3xl">
        All In One
      </h1>
    </section>
  );
}
