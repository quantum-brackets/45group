import { getBookingById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, Users, Info, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default async function BookingDetailsPage({ params }: { params: { id: string } }) {
  const booking = await getBookingById(params.id);

  if (!booking) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Booking Details</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Reviewing booking <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{booking.id}</span>
        </p>
      </header>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            <Link href={`/listing/${booking.listingId}`} className="hover:underline text-primary">
              {booking.listingName}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 text-base">
          <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
            <Calendar className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Booking Dates</p>
              <p className="text-muted-foreground">
                {format(new Date(booking.startDate), 'PPP')} to {format(new Date(booking.endDate), 'PPP')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
            <Users className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Number of Guests</p>
              <p className="text-muted-foreground">{booking.guests}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
            <Info className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Status</p>
              <p>
                <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
                  {booking.status}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
            <Building className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Listing ID</p>
              <p className="text-muted-foreground font-mono text-sm">{booking.listingId}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button asChild>
                <Link href="/dashboard/bookings">Back to Bookings</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
