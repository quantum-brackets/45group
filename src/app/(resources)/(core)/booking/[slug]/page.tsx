import { Breadcrumbs } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import Button from "~/components/button";
import ResourceTypeChip from "~/components/resource/type-chip";
import ResourceService from "~/services/resources";
import { textConverter } from "~/utils/helpers";

export default async function BookingDetails({ params: { slug } }: { params: { slug: string } }) {
  const resource = await ResourceService.getPublicResource(slug);

  console.log(resource.id);

  return (
    <div className="flex w-full max-w-[1500px] flex-grow flex-col gap-6 self-center p-6">
      <header>
        <Breadcrumbs>
          {[
            <Link
              href={"/booking"}
              key="1"
              className="text-base font-medium text-zinc-600 hover:underline tablet:text-sm"
            >
              Booking
            </Link>,
            <small key="2" className="text-base font-medium text-zinc-600 tablet:text-sm">
              {resource.name}
            </small>,
          ]}
        </Breadcrumbs>
      </header>
      <section className="flex gap-8">
        <div className="flex flex-col gap-4">
          <figure className="relative h-[500px] w-[700px] rounded-2xl border">
            <Image
              src={resource.medias?.[0]?.url || ""}
              alt="Resource media"
              className="rounded-2xl object-contain"
              fill
              sizes="100%"
            />
          </figure>
          {resource.medias?.length && (
            <div className="flex gap-4">
              {resource.medias.map(({ id, url }) => (
                <Image
                  src={url}
                  alt="Resource media"
                  width={100}
                  height={100}
                  key={id}
                  className="rounded-lg border"
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium">{resource.name}</h1>
            <ResourceTypeChip type={resource.type} className="!justify-start [&_svg]:!m-0" />
            <small>
              {textConverter(resource.description, 200)}
              {resource.description.length > 200 && (
                <button
                  className="font-medium !text-primary"
                  onClick={() => {
                    const element = document.getElementById("product-description");
                    if (element) element.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Read More.
                </button>
              )}
            </small>
          </div>
          <Button className="!ml-auto">Reserve Now</Button>
        </div>
      </section>
      <section></section>
    </div>
  );
}
