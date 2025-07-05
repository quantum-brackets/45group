import { ListingFilters } from '@/components/listing/ListingFilters';
import { ListingCard } from '@/components/listing/ListingCard';
import { listings } from '@/lib/data';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold tracking-tight lg:text-5xl">
          Find Your Perfect Venue
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover and book unique hotels, event centers, and restaurants.
        </p>
      </header>
      
      <section className="mb-12">
        <ListingFilters />
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
