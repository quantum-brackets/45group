import { ReactNode, Suspense } from "react";
import { Skeleton } from "@mui/material";
import Filters from "~/modules/core-layout/booking-layout/filters";
import Header from "~/modules/core-layout/booking-layout/header";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-1700 flex-grow self-center tablet:flex-col">
      <Suspense>
        <Filters />
      </Suspense>
      <main className="w-[calc(100%-250px)] tablet:!w-full">
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
          <Header />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
