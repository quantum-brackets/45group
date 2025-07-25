
"use client";

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingsTable } from '@/components/bookings/BookingsTable';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import type { Booking, User, Role, Permission, Listing } from '@/lib/types';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { AddReservationDialog } from './AddReservationDialog';
import { hasPermission } from '@/lib/permissions';

interface BookingsDisplayProps {
  allBookings: Booking[];
  allListings: Listing[];
  allUsers: User[];
  session: User | null;
  permissions: Record<Role, Permission[]> | null;
}

export function BookingsDisplay({ allBookings, allListings, allUsers, session, permissions }: BookingsDisplayProps) {
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get('q')?.toLowerCase() || '';
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    if (!filterQuery) {
      return allBookings;
    }
    return allBookings.filter(booking => 
        JSON.stringify(booking).toLowerCase().includes(filterQuery)
    );
  }, [allBookings, filterQuery]);

  const isFiltered = !!filterQuery;
  const canCreateBooking = session && hasPermission(permissions, session, 'booking:create');

  return (
    <div className="grid gap-8">
      <section className="bg-card p-4 rounded-lg shadow-md border">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex-grow">
                <BookingsFilters />
            </div>
             {canCreateBooking && (
                <AddReservationDialog
                    allListings={allListings}
                    allUsers={allUsers}
                    isOpen={isAddOpen}
                    setIsOpen={setIsAddOpen}
                >
                    <Button onClick={() => setIsAddOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Reservation
                    </Button>
                </AddReservationDialog>
            )}
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
