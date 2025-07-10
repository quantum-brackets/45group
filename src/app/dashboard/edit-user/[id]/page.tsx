
import { notFound, redirect } from 'next/navigation';
import { getUserById } from '@/lib/data';
import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';
import { UserDetails } from '@/components/dashboard/UserDetails';
import { hasPermission, preloadPermissions } from '@/lib/permissions';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await preloadPermissions();
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
  if (!hasPermission(session, 'user:read')) {
    const urlParams = new URLSearchParams();
    urlParams.set('error', 'Permission Denied');
    urlParams.set('message', 'You do not have permission to view other users.');
    redirect(`/forbidden?${urlParams.toString()}`);
  }

  // Admins or users with general update permission can edit.
  if (hasPermission(session, 'user:update')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <UserForm user={user} session={session} />
      </div>
    );
  }

  // Otherwise, if they can only read, show read-only details.
  return <UserDetails user={user} />;
}
