
import { notFound, redirect } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { ListingForm } from '@/components/dashboard/ListingForm';
import { getSession } from '@/lib/session';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    const urlParams = new URLSearchParams();
    urlParams.set('error', 'Permission Denied');
    urlParams.set('message', 'You do not have permission to edit listings.');
    redirect(`/forbidden?${urlParams.toString()}`);
  }

  const listing = await getListingById(params.id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ListingForm listing={listing} />
    </div>
  );
}
