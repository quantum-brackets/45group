
export type ListingType = 'hotel' | 'events' | 'restaurant';

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
  maxGuests: number;
}

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  userName?: string;
  listingName: string;
  startDate: string;
  endDate: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'guest';
}
