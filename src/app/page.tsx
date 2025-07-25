
/**
 * @fileoverview The homepage of the application.
 * This server component fetches a sample of listings for each service type
 * and displays the main hero section, services, and contact information.
 */
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import StaticCard from '@/components/common/StaticCard';
import { getListingTypesWithSampleImages } from '@/lib/data';

export default async function HomePage() {
  // Fetch a list of service types (e.g., "Hotel", "Events") along with sample images for each.
  // This is done on the server at build time or request time.
  const services = await getListingTypesWithSampleImages();

  return (
    <div className="flex flex-col gap-12 py-12">
      {/* Hero Section: The main welcome area with a call-to-action. */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-headline font-bold tracking-tight md:text-5xl lg:text-6xl">
            Your Experience Awaits
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From cozy restaurants to grand hotels and event spaces, find your next adventure at a 45 group location!
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

      {/* Services Section: Displays the different types of services offered. */}
      <section className="">
        <div className="container mx-auto px-4 flex flex-col gap-4">
          <h2 id="services" className="text-3xl font-headline font-bold">Services</h2>
          <p className="text-l text-muted-foreground">
            Across a variety of stunning sites.
            Immerse yourself in unique moments that linger in your mind,
            creating memories that will last a lifetime.
          </p>
          {/* Grid of service cards. Each card links to the search page filtered by that service type. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((srvc) => (
              <StaticCard
                key={srvc.name}
                name={srvc.name}
                link={`/search?type=${srvc.name.toLowerCase()}`}
                images={srvc.images}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contacts Section: Provides contact information. */}
      <section className="py-20">
        <div className="container mx-auto px-4 flex flex-col gap-4">
          <h2 id="contact" className="text-3xl font-headline font-bold">Contact</h2>
          <p className="text-l text-muted-foreground">
            For comprehensive support and assistance with your travel needs,
            please don't hesitate to contact the dedicated team at 45 Group,
            who can expertly help you with booking comfortable lodges for your stay,
            guide you through the process of attending local events and attractions,
            or assist in making reservations at the finest restaurants
            in the area to enhance your dining experience.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 py-4">
            <div className="flex flex-col items-center gap-2">
              <b>Email</b>
              <a href="mailto:info@45group.org">info@45group.org</a>
            </div>
            <div className="flex flex-col items-center gap-2">
              <b>Phone</b>
              <a href="tel:+2348174683545">+234 8174683545</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

    