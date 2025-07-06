
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    // This can happen if the session cookie is present but invalid/expired.
    // The middleware lets it through, but the layout's check fails.
    // Redirect to login to re-authenticate.
    const params = new URLSearchParams();
    params.set('from', '/dashboard'); // Let the login page know where to redirect back to.
    redirect(`/login?${params.toString()}`);
  }

  if (session.role !== 'admin') {
    // The user is logged in but doesn't have the required role.
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have the required permissions to access this page.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return <>{children}</>;
}
