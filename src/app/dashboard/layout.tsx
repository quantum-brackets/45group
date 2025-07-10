
import { getSession } from '@/lib/session';
import { hasPermission, preloadPermissions } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await preloadPermissions();
  const session = await getSession();

  if (!session) {
    const params = new URLSearchParams();
    params.set('from', '/dashboard'); 
    redirect(`/login?${params.toString()}`);
  }

  if (!hasPermission(session, 'dashboard:read')) {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have the required permissions to access this page.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return <>{children}</>;
}
