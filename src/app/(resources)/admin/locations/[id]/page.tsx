"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Button from "~/components/button";
import NotFound from "~/components/not-found";
import LocationsService from "~/services/locations";
import LocationDetailsMenu from "~/modules/location-details/menu";
import BackButton from "~/components/back-button";

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: location, isLoading } = useQuery({
    queryKey: ["locations", id],
    queryFn: () => LocationsService.getLocation(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!location) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton href="/admin/locations" text="Back to Locations" />
      <main className="flex gap-4 tablet:flex-col largeTabletAndBelow:gap-6">
        <section className="flex w-full flex-col gap-6 rounded-md border bg-zinc-50 p-4 largeLaptop:p-6">
          <div className="flex flex-col gap-2">
            <header className="flex items-center justify-between gap-8">
              <h1 className="text-xl">{location.name}</h1>
              <LocationDetailsMenu />
            </header>
            <pre className="font-merriweather text-sm text-zinc-600">{location.description}</pre>
          </div>
          <div className="flex flex-col gap-2">
            <h6 className="text-sm font-medium text-zinc-800">Details</h6>
            <div className="flex w-full flex-col gap-2">
              <p className="flex items-center justify-between gap-8 text-base">
                <span>State</span>
                <span className="text-zinc-700">{location.state}</span>
              </p>
              <p className="flex items-center justify-between gap-8 text-base">
                <span>City</span>
                <span className="text-zinc-700">{location.city}</span>
              </p>
            </div>
          </div>
        </section>
        <section className="flex h-fit w-full max-w-[400px] flex-col gap-4 rounded-md border bg-zinc-50 p-4 tablet:max-w-none largeLaptop:p-6">
          <header className="flex items-center justify-between gap-8">
            <h5 className="text-lg font-medium">Media</h5>
            <Button variant="outlined" size="small">
              Edit
            </Button>
          </header>
          {location.images ? (
            <main className="grid grid-cols-3 gap-2">
              {location.images.map(({ url }, index) => (
                <figure key={index} className="overflow-hidden rounded">
                  <Image src={url} alt="Resource image" className="h-full w-full" />
                </figure>
              ))}
            </main>
          ) : (
            <main className="flex h-28 items-center justify-center">
              <p>No images found</p>
            </main>
          )}
        </section>
      </main>
    </div>
  );
}
