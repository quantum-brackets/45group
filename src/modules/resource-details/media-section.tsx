"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "~/components/button";
import MediaModal from "~/components/modals/media";
import { Resource } from "~/db/schemas/resources";
import { useDeleteResourceMedia, useUploadResourceMedia } from "~/hooks/resources";

type Props = {
  resource: Resource;
};

export default function ResourceMediaSection({ resource }: Props) {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const handleMediaOpen = () => setIsMediaModalOpen(true);
  const handleMediaClose = () => setIsMediaModalOpen(false);

  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadResourceMedia();
  const { mutateAsync: deleteMedia, isPending: isDeleting } = useDeleteResourceMedia();

  return (
    <section className="flex h-fit w-full max-w-[400px] flex-col gap-4 rounded-md border bg-zinc-50 p-4 tablet:max-w-none largeLaptop:p-6">
      <header className="flex items-center justify-between gap-8">
        <h5 className="text-lg font-medium">Media</h5>
        <Button variant="outlined" size="small" onClick={handleMediaOpen}>
          Edit
        </Button>
        <MediaModal
          title="Media"
          subtitle="Add medias of the resource."
          multiple
          medias={resource.medias || []}
          open={isMediaModalOpen}
          handleClose={handleMediaClose}
          isLoading={isUploading || isDeleting}
          handleSubmit={async (medias: File[], media_ids: string[]) => {
            if (media_ids.length > 0) {
              await deleteMedia({ id: resource.id, data: { media_ids } });
            }

            if (medias.length > 0) {
              await uploadMedia({
                id: resource.id,
                data: {
                  medias,
                },
              });
            }
          }}
        />
      </header>
      {resource.medias?.length ? (
        <main className="grid grid-cols-3 gap-2 tablet:grid-cols-[repeat(auto-fill,100px)]">
          {resource.medias.map(({ url }, index) => (
            <figure
              key={index}
              className="relative aspect-square overflow-hidden rounded-md border-[0.5px] border-black/10"
            >
              <Image
                src={url}
                alt="Resource image"
                fill
                sizes="100%"
                className="h-full w-full object-contain p-[2px]"
              />
            </figure>
          ))}
        </main>
      ) : (
        <main className="flex h-28 items-center justify-center">
          <p>No medias found</p>
        </main>
      )}
    </section>
  );
}
