"use client";

import Image from "next/image";
import { useState } from "react";
import { FaRegTrashCan } from "react-icons/fa6";
import Button from "~/components/button";
import MediaModal from "~/components/modals/media";
import { Resource } from "~/db/schemas/resources";
import { useUpdateResource } from "~/hooks/resources";

type Props = {
  resource: Resource;
};

export default function ResourceThumbnailSection({ resource }: Props) {
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);

  const handleThumbnailOpen = () => setIsThumbnailModalOpen(true);
  const handleThumbnailClose = () => setIsThumbnailModalOpen(false);

  const { mutateAsync: updateResource, isPending: isUpdating } = useUpdateResource();

  return (
    <section className="flex h-fit w-full max-w-[400px] flex-col gap-4 rounded-md border bg-zinc-50 p-4 tablet:max-w-none largeLaptop:p-6">
      <header className="flex items-center justify-between gap-8">
        <h5 className="text-lg font-medium">Thumbnail</h5>
        <div className="flex gap-2">
          <Button variant="outlined" size="small" onClick={handleThumbnailOpen}>
            Edit
          </Button>
          <Button variant="outlined" size="small" onClick={handleThumbnailClose}>
            <FaRegTrashCan />
          </Button>
        </div>
        <MediaModal
          title="Thumbnail"
          subtitle="Add thumbnail to the resource."
          medias={[{ url: resource.thumbnail, id: crypto.randomUUID() }]}
          open={isThumbnailModalOpen}
          handleClose={handleThumbnailClose}
          isLoading={isUpdating}
          handleSubmit={async (medias: File[], media_ids: string[]) => {
            if (medias.length > 0) {
              await updateResource({
                id: resource.id,
                data: {
                  thumbnail: medias[0],
                },
              });
            }
          }}
        />
      </header>
      {resource.thumbnail ? (
        <figure className="relative aspect-square w-40 overflow-hidden rounded-md border-[0.5px] border-black/10">
          <Image
            src={resource.thumbnail}
            alt="Resource thumbnail"
            fill
            sizes="100%"
            className="h-full w-full object-contain p-[2px]"
          />
        </figure>
      ) : (
        <main className="flex h-28 items-center justify-center">
          <p>No thumbnail found</p>
        </main>
      )}
    </section>
  );
}
