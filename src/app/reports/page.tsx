
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

export default function ReportsRedirectPage() {
  // Redirect to a default global report: current date, 1-month period.
  const today = format(new Date(), 'yyyy-MM-dd');
  redirect(`/reports/${today}/1m`);
}
