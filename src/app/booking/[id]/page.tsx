
import { getAllUsers, getBookingById, getInventoryByListingId, getListingById } from '@/lib/data';
import { getSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { BookingDetails } from '@/components/bookings/BookingDetails';
import type { User } from '@/lib/types';
import { hasPermission, preloadPermissions } from '@/lib/permissions';

export default async function BookingDetailsPage({ params }: { params: { id: string } }) {
  await preloadPermissions();
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const booking = await getBookingById(params.id);

  if (!booking) {
    notFound();
  }

  const listing = await getListingById(booking.listingId);
  if (!listing) {
      notFound();
  }

  const inventory = await getInventoryByListingId(booking.listingId);
  
  let allUsers: User[] = [];
  if (hasPermission(session, 'booking:create')) {
    allUsers = await getAllUsers();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookingDetails booking={booking} listing={listing} session={session} totalInventoryCount={inventory.length} allUsers={allUsers} />
    </div>
  );
}
