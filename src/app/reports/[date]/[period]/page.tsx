import { notFound } from "next/navigation";
import { getAllBookings, getAllListings } from "@/lib/data";
import { ListingReport } from "@/components/reports/ListingReport";
import { getSession } from "@/lib/session";
import { sub, format } from "date-fns";

interface AllListingsReportPageProps {
  params: {
    date: string;
    period: string;
  };
}

const parsePeriod = (period: string): { unit: Duration; amount: number } => {
  const amount = parseInt(period.slice(0, -1), 10);
  const unitChar = period.slice(-1);

  if (isNaN(amount)) return { unit: { months: 1 }, amount: 1 };

  switch (unitChar) {
    case "d":
      return { unit: { days: amount }, amount: 1 };
    case "w":
      return { unit: { weeks: amount }, amount: 1 };
    case "m":
      return { unit: { months: amount }, amount: 1 };
    case "q":
      return { unit: { quarters: amount }, amount: 1 };
    case "y":
      return { unit: { years: amount }, amount: 1 };
    default:
      return { unit: { months: 1 }, amount: 1 };
  }
};

export default async function AllListingsReportPage({
  params,
}: AllListingsReportPageProps) {
  const session = await getSession();

  if (session?.role !== "admin" && session?.role !== "staff") {
    notFound();
  }

  const { period, date: toDate } = await params;
  const { unit: durationUnit, amount: durationAmount } = parsePeriod(period);

  // the duration points to a date in the past
  const fromDate = format(sub(new Date(toDate), durationUnit), "yyyy-MM-dd");

  // Fetch bookings across all accessible listings for the date range
  const bookings = await getAllBookings({ fromDate, toDate });

  const allListingsForDropdown = await getAllListings();

  return (
    <div className="container mx-auto py-8">
      <ListingReport
        // No specific listing is passed, indicating an aggregated report
        allListings={allListingsForDropdown}
        initialBookings={bookings}
        initialDateRange={{ from: fromDate, to: toDate }}
        initialPeriod={{ unit: period.slice(-1), amount: durationAmount }}
        session={session}
      />
    </div>
  );
}
