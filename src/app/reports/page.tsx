import { formatDateToStr } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default function ReportsRedirectPage() {
  // Redirect to a default global report: current date, 1-month period.
  const today = formatDateToStr(new Date(), 'yyyy-MM-dd');
  redirect(`/reports/${today}/1m`);
}
