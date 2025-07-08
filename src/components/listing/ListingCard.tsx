
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BedDouble, Building2, Star, Utensils } from 'lucide-react';
import type { Listing } from '@/lib/types';

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
  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative">
          <Link href={`/listing/${listing.id}`}>
            <img
              src={listing.images[0]}
              alt={listing.name}
              className="w-full h-48 object-cover"
              data-ai-hint={AITypeHints[listing.type]}
            />
          </Link>
          <Badge variant="secondary" className="absolute top-2 right-2 flex items-center gap-1">
            {typeIcons[listing.type]}
            <span>{typeLabels[listing.type]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/listing/${listing.id}`}>
          <CardTitle className="text-xl font-headline mb-2 truncate">{listing.name}</CardTitle>
        </Link>
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
          <span className="text-sm text-muted-foreground">/{listing.priceUnit}</span>
        </div>
        <Button asChild>
          <Link href={`/listing/${listing.id}`}>Book Now</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
