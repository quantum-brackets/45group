import { getAllBookings } from '@/lib/data';
import { BookingsTable } from '@/components/dashboard/BookingsTable';
import { getSession } from '@/lib/session';
import { User } from '@/lib/types';

export default async function BookingsPage() {
  const bookings = await getAllBookings();
  const session = await getSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold tracking-tight">
          {session?.role === 'admin' ? 'All Bookings' : 'My Bookings'}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {session?.role === 'admin' ? 'Manage all bookings for your venues.' : 'View your past and upcoming bookings.'}
        </p>
      </header>
      <div className="grid gap-8">
        {bookings.length > 0 ? (
          <BookingsTable bookings={bookings} />
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-2xl font-semibold">No Bookings Found</h2>
            <p className="text-muted-foreground mt-2">You haven't made any bookings yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
