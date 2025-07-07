
import { getBookingById, getListingById } from '@/lib/data';
import { getSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { BookingDetails } from '@/components/bookings/BookingDetails';

export default async function BookingDetailsPage({ params }: { params: { id: string } }) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <BookingDetails booking={booking} listing={listing} session={session} />
    </div>
  );
}
