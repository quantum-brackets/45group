"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { debounce, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import BookingCard from "~/components/booking-card";
import bookingsData from "~/data/bookings.json";
import NoDataIllustration from "~/assets/illustrations/no-data.png";

export default function BookingItems() {
  const searchParams = useSearchParams();

  const [debouncedQ, setDebouncedQ] = useState<string | undefined>(undefined);

  const params: BookingSearchParams = useMemo(() => {
    return ["type", "city", "group", "from", "to", "sort_by", "q"].reduce((acc, param) => {
      acc[param as keyof BookingSearchParams] = searchParams.get(param) || undefined;
      return acc;
    }, {} as BookingSearchParams);
  }, [searchParams]);

  const debouncedSetQ = useMemo(
    () =>
      debounce((value: string | undefined) => {
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

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", { ...params, q: debouncedQ }],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([] as Booking[]);
        }, 5000);
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Skeleton />
      </div>
    );
  }

  if (!bookings || !bookings.length) {
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
    <div className="flex min-h-screen w-full flex-col gap-6 p-4">
      {bookings.map((booking, index) => (
        <BookingCard key={index} booking={booking} />
      ))}
    </div>
  );
}