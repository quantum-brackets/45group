
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BedDouble, Building2, Star, Utensils } from 'lucide-react';
import type { Listing } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface ListingCardProps {
  listing: Listing;
}

const typeIcons = {
  hotel: <BedDouble className="w-4 h-4" />,
  events: <Building2 className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
};

const typeLabels = {
  hotel: 'Hotel',
  events: 'Events',
  restaurant: 'Restaurant',
};

const AITypeHints = {
  hotel: 'hotel room',
  events: 'event venue',
  restaurant: 'restaurant dining',
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/listing/${listing.id}`);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/listing/${listing.id}`);
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="flex flex-col overflow-hidden transition-transform duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={listing.images[0]}
            alt={`Image of ${listing.name}, our ${typeLabels[listing.type]} venue for great hospitality in ${listing.location}`}
            className="w-full h-48 object-cover"
            data-ai-hint={AITypeHints[listing.type]}
          />
          <Badge variant="secondary" className="absolute top-2 right-2 flex items-center gap-1">
            {typeIcons[listing.type]}
            <span>{typeLabels[listing.type]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-2 truncate">{listing.name}</CardTitle>
        <p className="text-muted-foreground text-sm mb-4">{listing.location}</p>
        <div className="flex items-center">
          <div className="flex items-center gap-0.5 text-primary">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.round(listing.rating) ? 'fill-current' : 'fill-muted stroke-muted-foreground'}`}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-muted-foreground">
            {listing.rating.toFixed(1)} ({listing.reviews.length} reviews)
          </span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div>
          <span className="text-lg font-bold text-primary">
             {new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency || 'NGN', minimumFractionDigits: 0 }).format(listing.price)}
          </span>
          <span className="text-sm text-muted-foreground">/{listing.price_unit}</span>
        </div>
        <Button onClick={handleButtonClick}>
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}
