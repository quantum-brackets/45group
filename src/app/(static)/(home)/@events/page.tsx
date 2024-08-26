import Image from "next/image";
import BirthdayParty from "~/assets/images/home/events/birthday-party.jpg";
import FlowerOnTable from "~/assets/images/home/events/flower-on-table.jpg";
import TableOnBeach from "~/assets/images/home/events/table-on-beach.jpg";

export default function Events() {
  return (
    <section className="flex flex-col gap-6 px-12">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl">Events ~</h1>
        <p>
          45Group is your gateway to unforgettable experiences. Enjoy unique moments that create
          lasting memories.
        </p>
      </header>
      <main className="grid grid-cols-2 gap-6">
        <figure className="relative max-h-[600px] w-full overflow-hidden rounded-xl">
          <Image
            src={FlowerOnTable}
            alt="Image of a flowers placed on a table"
            className="h-full w-full object-cover"
          />
          <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
        </figure>
        <div className="flex flex-col gap-8 self-end">
          <p className="text-sm">
            45Group is your gateway to unforgettable experiences, hosting events across a variety of
            stunning locations. Immerse yourself in unique moments that linger in your mind,
            creating memories that will last a lifetime.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <figure className="relative overflow-hidden rounded-lg">
              <Image
                src={BirthdayParty}
                alt="Image of a birthday party"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </figure>
            <figure className="relative overflow-hidden rounded-lg">
              <Image
                src={TableOnBeach}
                alt="Image of a table on the beach"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-0 z-[2] h-full w-full bg-black/40" />
            </figure>
          </div>
        </div>
      </main>
    </section>
  );
}
