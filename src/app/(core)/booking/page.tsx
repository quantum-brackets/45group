"use client";

import Image from "next/image";
import { Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import BookingCard from "~/components/booking-card";
import bookingsData from "~/data/bookings.json";
import NoDataIllustration from "~/assets/illustrations/no-data.png";
import { useSearchParams } from "next/navigation";

export default function Booking() {
  const searchParams = useSearchParams();

  const params: BookingSearchParams = [
    "type",
    "city",
    "group",
    "from",
    "to",
    "sort_by",
    "q",
  ].reduce((acc, param) => {
    acc[param as keyof BookingSearchParams] = searchParams.get(param) || undefined;
    return acc;
  }, {} as BookingSearchParams);

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["bookings", { ...params }],
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
