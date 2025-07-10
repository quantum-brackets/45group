
"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingsTable } from '@/components/bookings/BookingsTable';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import type { Booking, User, Role, Permission } from '@/lib/types';

interface BookingsDisplayProps {
  allBookings: Booking[];
  session: User | null;
  permissions: Record<Role, Permission[]> | null;
}

export function BookingsDisplay({ allBookings, session, permissions }: BookingsDisplayProps) {
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get('q')?.toLowerCase() || '';

  const filteredBookings = useMemo(() => {
    if (!filterQuery) {
      return allBookings;
    }
    return allBookings.filter(booking => 
        JSON.stringify(booking).toLowerCase().includes(filterQuery)
    );
  }, [allBookings, filterQuery]);

  const isFiltered = !!filterQuery;

  return (
    <div className="grid gap-8">
      <section className="bg-card p-4 rounded-lg shadow-md border">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex-grow">
                <BookingsFilters />
            </div>
        </div>
      </section>
      
      {filteredBookings.length > 0 ? (
        <BookingsTable bookings={filteredBookings} session={session} permissions={permissions} />
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">No Bookings Found</h2>
          <p className="text-muted-foreground mt-2">
            {isFiltered
              ? "Your search returned no results. Try a different query."
              : "You haven't made any bookings yet."}
          </p>
        </div>
      )}
    </div>
  );
}
