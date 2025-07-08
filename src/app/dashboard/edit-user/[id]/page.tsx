
import { notFound, redirect } from 'next/navigation';
import { getUserById } from '@/lib/data';
import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';
import { UserDetails } from '@/components/dashboard/UserDetails';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  
  // The layout already protects this page for admin/staff.
  // We just need to handle the case where a user somehow gets here without a session.
  if (!session) {
      redirect('/login');
  }

  const user = await getUserById(params.id);

  if (!user) {
    notFound();
  }
  
  // A guest cannot view another user's profile.
  if (session.role === 'guest') {
    const urlParams = new URLSearchParams();
    urlParams.set('error', 'Permission Denied');
    urlParams.set('message', 'You do not have permission to view other users.');
    redirect(`/forbidden?${urlParams.toString()}`);
  }

  // Admins can edit anyone (including themselves via this form).
  if (session.role === 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <UserForm user={user} />
      </div>
    );
  }

  // Staff can only view user details, not edit.
  if (session.role === 'staff') {
      return <UserDetails user={user} />;
  }
  
  // Fallback redirect if a role is unhandled.
  const urlParams = new URLSearchParams();
  urlParams.set('error', 'Permission Denied');
  urlParams.set('message', 'You do not have permission to perform this action.');
  redirect(`/forbidden?${urlParams.toString()}`);
}
