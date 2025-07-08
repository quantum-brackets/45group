
import { notFound, redirect } from 'next/navigation';
import { getUserById } from '@/lib/data';
import { UserForm } from '@/components/dashboard/UserForm';
import { getSession } from '@/lib/session';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    const urlParams = new URLSearchParams();
    urlParams.set('error', 'Permission Denied');
    urlParams.set('message', 'You do not have permission to edit users.');
    redirect(`/forbidden?${urlParams.toString()}`);
  }

  const user = await getUserById(params.id);

  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserForm user={user} />
    </div>
  );
}
