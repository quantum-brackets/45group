
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

export interface Bill {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  actorName: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  timestamp: string;
  actorName: string;
}

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  
  // From data JSONB
  createdAt: string;
  guests: number;
  inventoryIds: string[];
  bookingName?: string;
  actions: BookingAction[];
  bills?: Bill[];
  payments?: Payment[];

  // Joined fields
  userName?: string;
  listingName?: string;
  inventoryNames?: string[];
  userNotes?: string;
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
