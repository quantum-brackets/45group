
import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function AddUserPage() {
  const session = await getSession();
  if (session?.role !== 'admin') {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have permission to add new users.');
    redirect(`/forbidden?${params.toString()}`);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserForm />
    </div>
  );
}
