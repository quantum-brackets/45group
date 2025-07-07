
import { notFound } from 'next/navigation';
import { getUserById } from '@/lib/data';
import { UserForm } from '@/components/dashboard/UserForm';

export default async function EditUserPage({ params }: { params: { id: string } }) {
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
