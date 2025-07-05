import { getAllListings, getAllBookings } from '@/lib/data';
import { DashboardTables } from '@/components/dashboard/DashboardTables';

export default async function DashboardPage() {
  const listings = await getAllListings();
  const bookings = await getAllBookings();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Staff Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage your listings and bookings.</p>
      </header>
      <div className="grid gap-8">
        <DashboardTables listings={listings} bookings={bookings} />
      </div>
    </div>
  );
}
