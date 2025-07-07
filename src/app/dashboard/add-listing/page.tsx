
import { notFound } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { ListingForm } from '@/components/dashboard/ListingForm';

export default async function AddListingPage({ searchParams }: { searchParams: { duplicate?: string } }) {
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
