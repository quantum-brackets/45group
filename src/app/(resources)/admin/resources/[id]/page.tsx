"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import BackButton from "~/components/back-button";
import NotFound from "~/components/not-found";
import ResourceService from "~/services/resources";
import ResourceDetailsMenu from "~/modules/resource-details/menu";
import ResourceStatus from "~/modules/resource-details/status";
import ResourceTypeChip from "~/components/resource/type-chip";
import ResourceMediaSection from "~/modules/resource-details/media-section";
import RulesSection from "~/modules/resource-details/rules-section";
import ResourceThumbnailSection from "~/modules/resource-details/thumbnail-section";

export default function ResourceDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resources", id],
    queryFn: () => ResourceService.getResource(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!resource) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton href="/admin/resources" text="Back to Resources" />
      <main className="flex gap-6 tablet:flex-col largeTabletAndBelow:gap-6">
        <div className="flex w-full flex-col gap-6">
          <section className="flex w-full flex-col gap-6 rounded-md border bg-zinc-50 p-4 largeLaptop:p-6">
            <div className="flex flex-col gap-2">
              <header className="flex items-center justify-between gap-8">
                <h1 className="text-lg largeLaptop:text-xl">{resource.name}</h1>
                <div className="flex items-center gap-4">
                  <ResourceStatus status={resource.status} />
                  <ResourceDetailsMenu />
                </div>
              </header>
              <pre className="font-merriweather text-xs text-zinc-600 largeLaptop:text-sm">
                {resource.description}
              </pre>
            </div>
            <div className="flex flex-col gap-2">
              <h6 className="text-xs font-medium text-zinc-800 largeLaptop:text-sm">Details</h6>
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                  <span>Type</span>
                  <span className="text-zinc-600">
                    <ResourceTypeChip type={resource.type} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                  <span>Handle</span>
                  <span className="text-zinc-600">{resource.handle || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                  <span>Availability</span>
                  <span className="text-zinc-600">{resource.schedule_type}</span>
                </div>
                <div className="flex items-center justify-between gap-8 text-sm largeLaptop:text-base">
                  <span>Location</span>
                  <span className="text-zinc-600">{resource.location?.name}</span>
                </div>
              </div>
            </div>
          </section>
          <RulesSection resource={resource} />
          <RulesSection resource={resource} />
        </div>
        <div className="gap-6">
          <ResourceThumbnailSection resource={resource} />
          <ResourceMediaSection resource={resource} />
        </div>
      </main>
    </div>
  );
}
