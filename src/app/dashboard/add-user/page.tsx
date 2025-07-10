

import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';

export default async function AddUserPage() {
  const permissions = await preloadPermissions();
  const session = await getSession();
  if (!session || !hasPermission(permissions, session, 'user:create')) {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have permission to add new users.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserForm session={session} />
    </div>
  );
}
