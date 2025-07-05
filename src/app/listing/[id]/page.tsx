import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getListingById } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookingForm } from '@/components/listing/BookingForm';
import { BedDouble, Building2, CheckCircle, MapPin, Star, Utensils } from 'lucide-react';

const typeIcons = {
  hotel: <BedDouble className="w-5 h-5 mr-2" />,
  events: <Building2 className="w-5 h-5 mr-2" />,
  restaurant: <Utensils className="w-5 h-5 mr-2" />,
};

const AITypeHints = {
    hotel: 'hotel room interior',
    events: 'conference hall',
    restaurant: 'restaurant interior',
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const listing = getListingById(params.id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          {/* Title and meta */}
          <div className="mb-4">
            <h1 className="text-4xl font-headline font-bold tracking-tight">{listing.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                <span>{listing.rating} ({listing.reviews.length} reviews)</span>
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
                  <Image
                    src={src}
                    alt={`${listing.name} image ${index + 1}`}
                    width={800}
                    height={600}
                    className="w-full h-[500px] object-cover"
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
                  About this {listing.type === 'events' ? 'event' : listing.type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80">{listing.description}</p>
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">What this place offers</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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

            {/* Reviews */}
            {listing.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    {listing.rating.toFixed(1)} &middot; {listing.reviews.length} reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {listing.reviews.map(review => (
                    <div key={review.id} className="flex gap-4">
                      <Avatar>
                        <AvatarImage src={review.avatar} alt={review.author} data-ai-hint="person face" />
                        <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{review.author}</p>
                           <div className="flex items-center gap-0.5 text-primary">
                            {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'fill-muted stroke-muted-foreground'}`} />
                            ))}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <BookingForm listing={listing} />
          </div>
        </div>
      </div>
    </div>
  );
}
