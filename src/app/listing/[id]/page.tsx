

import { notFound } from 'next/navigation';
import { getListingById, getConfirmedBookingsForListing, getAllUsers } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { BookingForm } from '@/components/listing/BookingForm';
import { BedDouble, Building2, CheckCircle, MapPin, Star, Utensils } from 'lucide-react';
import { getSession } from '@/lib/session';
import { ReviewSection } from '@/components/listing/ReviewSection';
import { BackButton } from '@/components/common/BackButton';
import type { User } from '@/lib/types';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';
import { ListingTypes } from '@/lib/types';

const typeIcons = {
  [ListingTypes.HOTEL]: <BedDouble className="w-5 h-5 mr-2" />,
  [ListingTypes.EVENTS]: <Building2 className="w-5 h-5 mr-2" />,
  [ListingTypes.RESTAURANT]: <Utensils className="w-5 h-5 mr-2" />,
};

const AITypeHints = {
    [ListingTypes.HOTEL]: 'hotel room interior',
    [ListingTypes.EVENTS]: 'conference hall',
    [ListingTypes.RESTAURANT]: 'restaurant interior',
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const permissions = await preloadPermissions();
  const listing = await getListingById(params.id);
  const session = await getSession();
  const confirmedBookings = await getConfirmedBookingsForListing(params.id);

  if (!listing) {
    notFound();
  }
  
  let allUsers: User[] = [];
  if (session && hasPermission(permissions, session, 'booking:create')) {
    allUsers = await getAllUsers();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <BackButton />
      </div>
      <div className="grid lg:grid-cols-3 gap-8 lg:gap-4">
        <div className="grid lg:col-span-2">
          {/* Title and meta */}
          <div className="mb-4">
            <h1 className="text-4xl font-headline font-bold tracking-tight">{listing.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                <span>{listing.rating.toFixed(1)} ({listing.reviews.length} reviews)</span>
              </div>
              <span>&middot;</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.location}</span>
              </div>
            </div>
          </div>
          
          {/* Image Carousel */}
          <Carousel className="w-full mb-8 rounded-lg overflow-hidden shadow-lg">
            <CarouselContent>
              {listing.images.map((src, index) => (
                <CarouselItem key={index}>
                  <img
                    src={src}
                    alt={`Photo ${index + 1} of ${listing.name}, a premium ${listing.type} venue offering outstanding hospitality services in ${listing.location}`}
                    className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover"
                    data-ai-hint={AITypeHints[listing.type]}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>

          {/* Description and Features */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {typeIcons[listing.type]}
                  About this space
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80">{listing.description}</p>
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">What this place offers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {listing.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <ReviewSection 
              listingId={listing.id}
              reviews={listing.reviews}
              averageRating={listing.rating}
              session={session}
            />
          </div>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-1 min-w-[327px]">
          <div className="sticky top-24">
            <BookingForm 
              listing={listing} 
              confirmedBookings={confirmedBookings} 
              session={session} 
              allUsers={allUsers}
              permissions={permissions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

    