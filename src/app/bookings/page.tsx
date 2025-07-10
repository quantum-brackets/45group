
import { getAllBookings } from '@/lib/data';
import { getSession } from '@/lib/session';
import { BookingsDisplay } from '@/components/bookings/BookingsDisplay';
import { preloadPermissions } from '@/lib/permissions';

export default async function BookingsPage() {
  await preloadPermissions();

  // With client-side filtering, we just get all relevant bookings.
  // The `getAllBookings` function already handles permissions (user sees their own, admin/staff sees all).
  const allBookings = await getAllBookings();
  const session = await getSession();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <BookingsDisplay 
        allBookings={allBookings}
        session={session}
      />
    </div>
  );
}
