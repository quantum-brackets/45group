"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { debounce, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import BookingCard from "~/components/booking-card";
import NoDataIllustration from "~/assets/illustrations/no-data.png";
import ResourceService from "~/services/resources";
import { Resource } from "~/db/schemas";
import { useCustomSearchParams } from "~/hooks/utils";

export default function BookingItems() {
  const [debouncedQ, setDebouncedQ] = useState("");

  const params = useCustomSearchParams(["type", "city", "group", "from", "to", "sort_by", "q"]);

  const debouncedSetQ = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQ(value);
      }, 1000),
    []
  );

  useEffect(() => {
    debouncedSetQ(params.q);
    return () => {
      debouncedSetQ.clear();
    };
  }, [params.q, debouncedSetQ]);

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["bookings", { ...params, q: debouncedQ }],
    queryFn: () => {
      const newParams = new URLSearchParams({ ...params, q: debouncedQ });
      return ResourceService.getPublicResources({ params: newParams });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Skeleton />
      </div>
    );
  }

  if (!resources || !resources.length) {
    return (
      <div className="flex w-full max-w-App flex-grow flex-col items-center justify-center gap-2 self-center p-8">
        <figure className="w-[30%]">
          <Image priority src={NoDataIllustration} alt="No data illustration" />
        </figure>
        <h3 className="mb-2 mt-3 text-center text-base font-semibold text-zinc-700">
          Booking not found
        </h3>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-6 p-8">
      {resources.map((resource, index) => (
        <BookingCard key={index} booking={resource} />
      ))}
    </div>
  );
}
