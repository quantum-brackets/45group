import { formatDateToStr } from '@/lib/utils';
import { redirect } from 'next/navigation';

interface ListingReportRedirectProps {
  params: {
    id: string;
  };
}

export default function ListingReportRedirectPage({ params }: ListingReportRedirectProps) {
  // Redirect to a default report: current date, 1-month period.
  const today = formatDateToStr(new Date(), 'yyyy-MM-dd');
  redirect(`/reports/listing/${params.id}/${today}/1m`);
}
