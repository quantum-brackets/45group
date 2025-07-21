import { notFound } from 'next/navigation';
import { sub } from 'date-fns';
import { getListingById, getBookingsByDateRange } from '@/lib/data';
import { ListingReport } from '@/components/reports/ListingReport';
import { getSession } from '@/lib/session';
import { toZonedTimeSafe } from '@/lib/utils';

interface ListingReportPageProps {
  params: {
    id: string;
    date: string;
    period: string;
  };
}

const parsePeriod = (period: string): { unit: Duration; amount: number } => {
  const amount = parseInt(period.slice(0, -1), 10);
  const unitChar = period.slice(-1);

  if (isNaN(amount)) return { unit: { months: 1 }, amount: 1 };

  switch (unitChar) {
    case 'd': return { unit: { days: amount }, amount };
    case 'w': return { unit: { weeks: amount }, amount };
    case 'm': return { unit: { months: amount }, amount };
    case 'q': return { unit: { quarters: amount }, amount };
    case 'y': return { unit: { years: amount }, amount };
    default: return { unit: { months: 1 }, amount: 1 };
  }
};


export default async function ListingReportPage({ params }: ListingReportPageProps) {
    const session = await getSession();

    if (session?.role !== 'admin' && session?.role !== 'staff') {
        notFound();
    }

    const listing = await getListingById(params.id);
    if (!listing) {
        notFound();
    }

    const { unit: durationUnit, amount: durationAmount } = parsePeriod(params.period);
    const targetDate = toZonedTimeSafe(params.date);

    // The date in the URL is now the END date of the report.
    const toDate = targetDate;
    // The start date is calculated by subtracting the period from the end date.
    const fromDate = sub(toDate, durationUnit);

    const bookings = await getBookingsByDateRange(params.id, fromDate.toISOString(), toDate.toISOString());

    return (
        <div className="container mx-auto py-8">
            <ListingReport 
                listing={listing} 
                initialBookings={bookings}
                initialDateRange={{ from: fromDate, to: toDate }}
                initialPeriod={{ unit: params.period.slice(-1), amount: durationAmount }}
                session={session}
            />
        </div>
    );
}
