
import { notFound } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { EditListingForm } from '@/components/listing/EditListingForm';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const listing = await getListingById(params.id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Edit Listing</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Make changes to "{listing.name}"
        </p>
      </header>
      
      <EditListingForm listing={listing} />
    </div>
  );
}
