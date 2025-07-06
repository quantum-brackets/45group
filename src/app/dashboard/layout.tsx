
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have the required permissions to access this page.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return <>{children}</>;
}
