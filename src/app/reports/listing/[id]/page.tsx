
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

interface ListingReportRedirectProps {
  params: {
    id: string;
  };
}

export default function ListingReportRedirectPage({ params }: ListingReportRedirectProps) {
  // Redirect to a default report: current date, 1-month period.
  const today = format(new Date(), 'yyyy-MM-dd');
  redirect(`/reports/listing/${params.id}/${today}/1m`);
}
