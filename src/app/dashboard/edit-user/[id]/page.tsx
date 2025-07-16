

import { notFound, redirect } from 'next/navigation';
import { getAllListings, getUserById } from '@/lib/data';
import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';
import { UserDetails } from '@/components/dashboard/UserDetails';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const permissions = await preloadPermissions();
  const session = await getSession();
  
  // The layout already protects this page.
  if (!session) {
      redirect('/login');
  }

  const user = await getUserById(params.id);

  if (!user) {
    notFound();
  }
  
  // A guest cannot view another user's profile.
  if (!hasPermission(permissions, session, 'user:read')) {
    const urlParams = new URLSearchParams();
    urlParams.set('error', 'Permission Denied');
    urlParams.set('message', 'You do not have permission to view other users.');
    redirect(`/forbidden?${urlParams.toString()}`);
  }

  // Admins or users with general update permission can edit.
  if (hasPermission(permissions, session, 'user:update')) {
    const allListings = await getAllListings();
    return (
      <div className="container mx-auto px-4 py-8">
        <UserForm user={user} session={session} allListings={allListings} />
      </div>
    );
  }

  // Otherwise, if they can only read, show read-only details.
  return <UserDetails user={user} />;
}
