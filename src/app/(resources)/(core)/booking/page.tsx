import { Suspense } from "react";
import BookingItems from "~/modules/booking/booking-items";

export default function Booking() {
  return (
    <>
      <Suspense>
        <BookingItems />
      </Suspense>
    </>
  );
}
