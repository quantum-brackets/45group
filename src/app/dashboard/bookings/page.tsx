import { getAllBookings } from '@/lib/data';
import { BookingsTable } from '@/components/dashboard/BookingsTable';

export default async function BookingsPage() {
  const bookings = await getAllBookings();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Bookings</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage all bookings for your venues.</p>
      </header>
      <div className="grid gap-8">
        <BookingsTable bookings={bookings} />
      </div>
    </div>
  );
}
