
export type ListingType = 'hotel' | 'events' | 'restaurant';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

export interface Review {
  id: string;
  userId?: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
}

export interface Listing {
  id:string;
  name: string;
  type: ListingType;
  location: string;
  description: string;
  images: string[];
  price: number;
  priceUnit: 'night' | 'hour' | 'person';
  currency: Currency;
  rating: number;
  reviews: Review[];
  features: string[];
  maxGuests: number;
  inventoryCount?: number;
}

export interface ListingInventory {
  id: string;
  listingId: string;
  name: string;
}

export interface Booking {
  id: string;
  listingId: string;
  inventoryId?: string;
  inventoryName?: string;
  userId: string;
  userName?: string;
  listingName: string;
  startDate: string;
  endDate: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt?: string;
  actionByUserId?: string;
  actionAt?: string;
  statusMessage?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'guest' | 'staff';
    status: 'active' | 'disabled';
    phone?: string;
    notes?: string;
}
