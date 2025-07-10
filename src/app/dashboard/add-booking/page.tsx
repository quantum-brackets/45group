
import { redirect } from 'next/navigation';

export default function AddBookingPage() {
    // This page is no longer used. Redirect to the main bookings list.
    redirect('/bookings');
}
