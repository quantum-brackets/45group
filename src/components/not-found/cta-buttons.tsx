"use client";

import Button from "~/components/button";

export default function CTAButtons() {
  return (
    <div className="mt-4 flex w-full items-center justify-center gap-8">
      <Button href="/booking" size="small" className="!w-fit whitespace-nowrap">
        Go to Booking
      </Button>
    </div>
  );
}
