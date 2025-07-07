
import { getAllBookings, getAllListings, getAllUsers } from '@/lib/data';
import { getSession } from '@/lib/session';
import { BookingsDisplay } from '@/components/bookings/BookingsDisplay';
import type { User } from '@/lib/types';

interface BookingsPageProps {
  searchParams: {
    listingId?: string;
    userId?: string;
    status?: string;
  };
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  // Backend filters will still handle listingId and userId for performance.
  // Status filtering will now be done on the client-side.
  const filters = {
    listingId: searchParams.listingId || undefined,
    userId: searchParams.userId || undefined,
  };

  const allBookings = await getAllBookings(filters);
  const session = await getSession();
  
  // Fetch data needed for filter dropdowns.
  const listings = await getAllListings();
  let users: User[] = [];
  if (session?.role === 'admin') {
      users = await getAllUsers();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookingsDisplay 
        allBookings={allBookings}
        listings={listings}
        users={users}
        session={session}
      />
    </div>
  );
}
