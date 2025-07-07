
import { getAllBookings, getAllListings, getAllUsers } from '@/lib/data';
import { BookingsTable } from '@/components/bookings/BookingsTable';
import { getSession } from '@/lib/session';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import type { Booking, Listing, User } from '@/lib/types';

interface BookingsPageProps {
  searchParams: {
    listingId?: string;
    userId?: string;
    status?: string;
  };
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const filters = {
    listingId: searchParams.listingId || undefined,
    userId: searchParams.userId || undefined,
    status: searchParams.status ? (searchParams.status as Booking['status']) : undefined,
  };

  const bookings = await getAllBookings(filters);
  const session = await getSession();
  
  // Fetch data needed for filter dropdowns.
  const listings = await getAllListings();
  let users: User[] = [];
  if (session?.role === 'admin') {
      users = await getAllUsers();
  }

  const isFiltered = !!(searchParams.listingId || searchParams.userId || searchParams.status);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <section className="bg-card p-4 rounded-lg shadow-md border">
            <BookingsFilters listings={listings} users={users} session={session} />
        </section>
        
        {bookings.length > 0 ? (
          <BookingsTable bookings={bookings} session={session} />
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
    </div>
  );
}
