export type ListingType = 'hotel' | 'event-center' | 'restaurant';

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
}

export interface Listing {
  id: string;
  name: string;
  type: ListingType;
  location: string;
  description: string;
  images: string[];
  price: number;
  priceUnit: 'night' | 'hour' | 'person';
  rating: number;
  reviews: Review[];
  features: string[];
}

export interface Booking {
  id: string;
  listingId: string;
  listingName: string;
  date: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}
