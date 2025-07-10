

import { getSession } from '@/lib/session';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = await preloadPermissions();
  const session = await getSession();

  if (!session) {
    const params = new URLSearchParams();
    params.set('from', '/dashboard'); 
    redirect(`/login?${params.toString()}`);
  }

  if (!hasPermission(permissions, session, 'dashboard:read')) {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have the required permissions to access this page.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return <>{children}</>;
}
