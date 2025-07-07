
"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingsTable } from '@/components/bookings/BookingsTable';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import type { Booking, Listing, User } from '@/lib/types';

interface BookingsDisplayProps {
  allBookings: Booking[];
  listings: Listing[];
  users: User[];
  session: User | null;
}

export function BookingsDisplay({ allBookings, listings, users, session }: BookingsDisplayProps) {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  const filteredBookings = useMemo(() => {
    if (!statusFilter || statusFilter === 'all') {
      return allBookings;
    }
    return allBookings.filter(booking => booking.status === statusFilter);
  }, [allBookings, statusFilter]);

  const isFiltered = !!(searchParams.get('listingId') || searchParams.get('userId') || (statusFilter && statusFilter !== 'all'));

  return (
    <div className="grid gap-8">
      <section className="bg-card p-4 rounded-lg shadow-md border">
        <BookingsFilters listings={listings} users={users} session={session} />
      </section>
      
      {filteredBookings.length > 0 ? (
        <BookingsTable bookings={filteredBookings} session={session} />
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">No Bookings Found</h2>
          <p className="text-muted-foreground mt-2">
            {isFiltered
              ? "Try adjusting your search filters."
              : "You haven't made any bookings yet."}
          </p>
        </div>
      )}
    </div>
  );
}
