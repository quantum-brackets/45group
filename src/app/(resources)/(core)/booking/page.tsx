"use client";

import { Suspense, useState } from "react";
import { Skeleton } from "@mui/material";
import Filters from "~/modules/core-layout/booking-layout/filters";
import Header from "~/modules/core-layout/booking-layout/header";
import BookingItems from "~/modules/booking/booking-items";

export default function Booking() {
  const [isMobileDrawerOpen, toggleMobileDrawer] = useState(false);

  return (
    <div className="flex w-full max-w-App flex-grow self-center tablet:flex-col">
      <Suspense fallback={null}>
        <Filters
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => toggleMobileDrawer(false)}
        />
      </Suspense>
      <main className="w-[calc(100%-300px)] tablet:!w-full largeTabletAndBelow:w-[calc(100%-250px)]">
        <Suspense
          fallback={
            <header className="flex w-full items-center justify-between gap-8 border-b-1.5 p-2 px-8 tablet:px-4">
              <Skeleton variant="rounded" className="h-[20px] w-[100px]" />
              <div className="flex items-center gap-4">
                <Skeleton variant="rounded" className="!h-[40px] w-[300px]" />
                <Skeleton variant="rounded" className="!h-[40px] w-[180px]" />
              </div>
            </header>
          }
        >
          <Header openMobileDrawer={() => toggleMobileDrawer(true)} />
        </Suspense>
        <Suspense>
          <BookingItems />
        </Suspense>
      </main>
    </div>
  );
}
