import { ReactNode, Suspense } from "react";
import Filters from "~/modules/core-layout/booking-layout/filters";
import Header from "~/modules/core-layout/booking-layout/header";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-1700 flex-grow tablet:flex-col">
      <Suspense>
        <Filters />
      </Suspense>
      <main className="w-[calc(100%-300px)] tablet:!w-full largeTabletAndBelow:w-[calc(100%-250px)]">
        <Suspense>
          <Header />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
