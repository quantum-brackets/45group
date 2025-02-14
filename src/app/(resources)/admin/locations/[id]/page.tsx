"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Button from "~/components/button";
import NotFound from "~/components/not-found";
import LocationsService from "~/services/locations";
import LocationDetailsMenu from "~/modules/location-details/menu";
import BackButton from "~/components/back-button";
import MediaModal from "~/components/modals/media";
import { useDeleteLocationMedia, useUploadLocationMedia } from "~/hooks/locations";

export default function LocationDetails() {
  const { id } = useParams<{ id: string }>();

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const handleMediaOpen = () => setIsMediaModalOpen(true);
  const handleMediaClose = () => setIsMediaModalOpen(false);

  const { data: location, isLoading } = useQuery({
    queryKey: ["locations", id],
    queryFn: () => LocationsService.getLocation(id),
    enabled: !!id,
  });

  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadLocationMedia();
  const { mutateAsync: deleteMedia, isPending: isDeleting } = useDeleteLocationMedia();

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
              <p className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                <span>State</span>
                <span className="text-zinc-600">{location.state}</span>
              </p>
              <p className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                <span>City</span>
                <span className="text-zinc-600">{location.city}</span>
              </p>
            </div>
          </div>
        </section>
        <section className="flex h-fit w-full max-w-[400px] flex-col gap-4 rounded-md border bg-zinc-50 p-4 tablet:max-w-none largeLaptop:p-6">
          <header className="flex items-center justify-between gap-8">
            <h5 className="text-lg font-medium">Media</h5>
            <Button variant="outlined" size="small" onClick={handleMediaOpen}>
              Edit
            </Button>
            <MediaModal
              title="Media"
              subtitle="Add images of the location."
              multiple
              open={isMediaModalOpen}
              handleClose={handleMediaClose}
              isLoading={isUploading || isDeleting}
              handleSubmit={async (medias: File[], media_ids: string[]) => {
                if (media_ids.length > 0) {
                  await deleteMedia({ id, data: { media_ids } });
                }

                if (medias.length > 0) {
                  await uploadMedia({
                    id,
                    data: {
                      name: location.name,
                      city: location.city,
                      state: location.state,
                      medias,
                    },
                  });
                }
              }}
            />
          </header>
          {location.medias?.length ? (
            <main className="grid grid-cols-3 gap-2 tablet:grid-cols-[repeat(auto-fill,100px)]">
              {location.medias.map(({ url }, index) => (
                <figure
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-md border-[0.5px] border-black/10"
                >
                  <Image
                    src={url}
                    alt="Location image"
                    fill
                    sizes="100%"
                    className="h-full w-full object-contain p-[2px]"
                  />
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
