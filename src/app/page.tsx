import { getAllListings } from '@/lib/data';
import { ListingCard } from '@/components/listing/ListingCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default async function HomePage() {
  // Fetch a few featured listings to display
  const allListings = await getAllListings();
  const featuredListings = allListings.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-card py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-headline font-bold tracking-tight lg:text-6xl">
            Your Perfect Venue Awaits
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From cozy restaurants to grand hotels and event spaces, find and book the perfect spot for any occasion.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/search">
                Start Searching <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-headline font-bold text-center mb-8">Featured Venues</h2>
          {featuredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mt-2">Could not load featured venues at this time.</p>
            </div>
          )}
           <div className="text-center mt-12">
             <Button asChild variant="outline">
                <Link href="/search">View All Venues</Link>
             </Button>
           </div>
        </div>
      </section>
    </div>
  );
}
