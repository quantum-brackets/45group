

import { getAllBookings, getAllListings, getAllUsers } from '@/lib/data';
import { getSession } from '@/lib/session';
import { BookingsDisplay } from '@/components/bookings/BookingsDisplay';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';

export default async function BookingsPage() {
  const permissions = await preloadPermissions();

  // With client-side filtering, we just get all relevant bookings.
  // The `getAllBookings` function already handles permissions (user sees their own, admin/staff sees all).
  const allBookings = await getAllBookings();
  const session = await getSession();

  // For the "Add Reservation" dialog, staff need access to all users and listings.
  let allListings = [];
  let allUsers = [];
  if(session && hasPermission(permissions, session, 'booking:create')) {
    allListings = await getAllListings();
    allUsers = await getAllUsers();
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <BookingsDisplay 
        allBookings={allBookings}
        allListings={allListings}
        allUsers={allUsers}
        session={session}
        permissions={permissions}
      />
    </div>
  );
}
