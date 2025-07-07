
import { getFilteredListings } from '@/lib/data';
import { ListingFilters } from '@/components/listing/ListingFilters';
import { ListingCard } from '@/components/listing/ListingCard';
import type { Listing } from '@/lib/types';
import { parseISO } from 'date-fns';

interface SearchPageProps {
  searchParams: {
    location?: string;
    type?: string;
    guests?: string;
    from?: string;
    to?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = {
    location: searchParams.location || '',
    type: (searchParams.type as Listing['type']) || '',
    guests: searchParams.guests || '',
    date:
      searchParams.from 
      ? { from: parseISO(searchParams.from), to: searchParams.to ? parseISO(searchParams.to) : undefined }
      : undefined,
  };

  const filteredListings = await getFilteredListings(filters);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 sticky top-[63px] bg-background/95 z-30 py-4 backdrop-blur-sm -mx-4 px-4 border-b">
        <ListingFilters />
      </section>

      <section>
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
           <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Listings Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search filters to find what you're looking for.</p>
          </div>
        )}
      </section>
    </div>
  );
}
