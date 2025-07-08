
import { notFound, redirect } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { ListingForm } from '@/components/dashboard/ListingForm';
import { getSession } from '@/lib/session';

export default async function AddListingPage({ searchParams }: { searchParams: { duplicate?: string } }) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    const params = new URLSearchParams();
    params.set('error', 'Permission Denied');
    params.set('message', 'You do not have permission to add new listings.');
    redirect(`/forbidden?${params.toString()}`);
  }

  let listingToDuplicate = null;
  const isDuplicateMode = !!searchParams.duplicate;

  if (isDuplicateMode) {
    listingToDuplicate = await getListingById(searchParams.duplicate!);
    if (!listingToDuplicate) {
      notFound();
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ListingForm listing={listingToDuplicate} isDuplicate={isDuplicateMode} />
    </div>
  );
}
