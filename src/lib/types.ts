
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

export interface BookingAction {
  timestamp: string;
  actorId: string;
  actorName: string;
  action: 'Created' | 'Updated' | 'Confirmed' | 'Cancelled' | 'System';
  message: string;
}

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt?: string;

  // From data JSONB
  guests: number;
  inventoryIds: string[];
  bookingName?: string;
  actions: BookingAction[];

  // Joined fields
  userName?: string;
  listingName?: string;
  inventoryNames?: string[];
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
