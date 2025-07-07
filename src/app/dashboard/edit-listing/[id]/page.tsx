
import { notFound } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { EditListingForm } from '@/components/dashboard/EditListingForm';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const listing = await getListingById(params.id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EditListingForm listing={listing} />
    </div>
  );
}
