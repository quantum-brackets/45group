
export type ListingType = 'hotel' | 'events' | 'restaurant';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

export interface Review {
  id: string;
  user_id?: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved';
}

export interface Listing {
  id:string;
  name: string;
  type: ListingType;
  location: string;
  description: string;
  images: string[];
  price: number;
  price_unit: 'night' | 'hour' | 'person';
  currency: Currency;
  rating: number;
  reviews: Review[];
  features: string[];
  max_guests: number;
  inventoryCount?: number;
}

export interface ListingInventory {
  id: string;
  listing_id: string;
  name: string;
}

export interface Booking {
  id: string;
  listingId: string;
  inventoryIds: string[];
  inventoryNames?: string[];
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
    status: 'active' | 'disabled' | 'provisional';
    phone?: string;
    notes?: string;
}
