import { notFound } from 'next/navigation';
import { add, sub } from 'date-fns';
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

    // Calculate date range based on the period type
    // For day, week, month, it's the period *ending* on the target date.
    // For quarter, year, it's the period *containing* the target date.
    let fromDate: Date;
    let toDate: Date;

    if (['q', 'y'].includes(params.period.slice(-1))) {
        // For quarter and year, we don't have startOfQuarter/Year in date-fns,
        // so we'll approximate or handle it simply for now.
        // This logic can be expanded. For simplicity, we'll treat it like a month for now.
        const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        fromDate = sub(startOfMonth, durationUnit);
        toDate = add(startOfMonth, durationUnit);
    } else {
        toDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        fromDate = sub(toDate, durationUnit);
    }


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
