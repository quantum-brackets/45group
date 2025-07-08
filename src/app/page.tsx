
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const locations = [
  {
    name: 'Abuja',
    image: 'https://placehold.co/400x600.png',
    hint: 'hotel bedroom',
  },
  {
    name: 'Calabar',
    image: 'https://placehold.co/400x600.png',
    hint: 'restaurant dining',
  },
  {
    name: 'Ikom',
    image: 'https://placehold.co/400x600.png',
    hint: 'hotel room',
  },
];

export default async function HomePage() {
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

      {/* Lodges Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-baseline gap-x-3">
            <h2 className="text-3xl font-headline font-bold">Lodges</h2>
            <p className="text-xl text-muted-foreground">
              ~ Find your next adventure at a 45 group location!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((location) => (
              <Link href={`/search?location=${location.name}`} key={location.name} className="group">
                <div className="relative rounded-2xl overflow-hidden h-[500px] shadow-lg">
                  <img
                    src={location.image}
                    data-ai-hint={location.hint}
                    alt={`Lodge in ${location.name}`}
                    className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors duration-300 group-hover:bg-black/40">
                    <h3 className="text-white text-4xl font-headline font-bold tracking-wider">
                      {location.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
