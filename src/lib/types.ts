
/**
 * @fileoverview This file contains all the TypeScript type definitions for the
 * application's data models. Centralizing these types ensures consistency and
 * type safety across the entire codebase.
 */

// Represents the types of listings available.
export type ListingType = 'hotel' | 'events' | 'restaurant';
// Represents the supported currencies.
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

/**
 * Represents a review left by a user for a listing.
 * Stored within the `reviews` array in the `data` JSONB column of a listing.
 */
export interface Review {
  id: string; // Unique identifier for the review.
  user_id?: string; // The ID of the user who wrote the review.
  author: string; // The name of the user.
  avatar: string; // URL to the user's avatar image.
  rating: number; // The rating given, from 1 to 5.
  comment: string; // The text content of the review.
  status: 'pending' | 'approved'; // Reviews must be approved by an admin.
}

/**
 * Represents a single bookable listing (e.g., a hotel, an event center).
 * This combines top-level columns from the `listings` table with fields
 * from the `data` JSONB column.
 */
export interface Listing {
  id:string; // The unique UUID of the listing.
  name: string; // The name of the listing.
  type: ListingType; // The category of the listing.
  location: string; // The physical location of the listing.
  description: string; // A detailed description.
  images: string[]; // An array of URLs for images of the listing.
  price: number; // The base price.
  price_unit: 'night' | 'hour' | 'person'; // The unit for the base price.
  currency: Currency; // The currency for the price.
  rating: number; // The calculated average rating from approved reviews.
  reviews: Review[]; // An array of all reviews for the listing.
  features: string[]; // An array of features or amenities.
  max_guests: number; // The maximum number of guests per bookable unit.
  inventoryCount?: number; // The total number of bookable units for this listing (joined from `listing_inventory`).
}

/**
 * Represents a single bookable unit within a listing (e.g., Room 101, Conference Hall A).
 * This corresponds to a row in the `listing_inventory` table.
 */
export interface ListingInventory {
  id: string; // The unique UUID of the inventory unit.
  listing_id: string; // Foreign key linking to the `listings` table.
  name: string; // The name of the unit (e.g., "Standard Queen Room").
}

/**
 * Represents an action taken on a booking, creating an audit trail.
 * Stored within the `actions` array in the `data` JSONB column of a booking.
 */
export interface BookingAction {
  timestamp: string; // ISO 8601 timestamp of when the action occurred.
  actorId: string; // The ID of the user who performed the action.
  actorName: string; // The name of the user who performed the action.
  action: 'Created' | 'Updated' | 'Confirmed' | 'Cancelled' | 'Completed' | 'System'; // The type of action.
  message: string; // A descriptive message about the action.
}

/**
 * Represents an individual bill item added to a booking.
 * Stored within the `bills` array in the `data` JSONB column of a booking.
 */
export interface Bill {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  actorName: string; // The name of the user who added the bill.
}

/**
 * Represents a payment recorded for a booking.
 * Stored within the `payments` array in the `data` JSONB column of a booking.
 */
export interface Payment {
  id: string;
  amount: number;
  method: 'Cash' | 'Transfer' | 'Debit' | 'Credit';
  notes?: string;
  timestamp: string;
  actorName: string; // The name of the user who recorded the payment.
}

/**
 * Represents a booking made by a user for a listing.
 * This combines top-level columns from the `bookings` table with fields
 * from the `data` JSONB column.
 */
export interface Booking {
  id: string; // The unique UUID of the booking.
  listingId: string; // Foreign key to the `listings` table.
  userId: string; // Foreign key to the `users` table.
  startDate: string; // ISO 8601 start date of the booking.
  endDate: string; // ISO 8601 end date of the booking.
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed'; // The current status of the booking.
  
  // Fields from the 'data' JSONB column
  createdAt: string; // When the booking was first created.
  guests: number; // The number of guests for the booking.
  inventoryIds: string[]; // An array of `listing_inventory` IDs booked.
  bookingName?: string; // The name the booking was made under.
  actions: BookingAction[]; // The audit trail of all actions on this booking.
  bills?: Bill[]; // An array of additional charges.
  payments?: Payment[]; // An array of payments made.
  discount?: number; // A percentage discount applied to the booking (e.g., 5 for 5%).

  // Fields joined from other tables for display purposes
  userName?: string; // The name of the user who owns the booking.
  listingName?: string; // The name of the listing being booked.
  inventoryNames?: string[]; // The names of the specific units booked.
  userNotes?: string; // Internal notes about the user.
}

/**
 * Represents a user of the application.
 * This combines top-level columns from the `users` table with fields
 * from the `data` JSONB column.
 */
export interface User {
    id: string; // The unique UUID of the user.
    name: string; // The user's full name.
    email: string; // The user's email address.
    password?: string; // The hashed password (only present in the `data` column).
    role: 'admin' | 'guest' | 'staff'; // The user's role, determines permissions.
    status: 'active' | 'disabled' | 'provisional'; // The user's account status.
    phone?: string; // The user's phone number.
    notes?: string; // Internal notes about the user, visible to admins/staff.
    password_reset_token?: string; // Token for password reset.
    password_reset_expires?: number; // Expiry timestamp for the reset token.
}

/**
 * Defines all possible permissions in the system.
 * This list serves as the single source of truth for what actions are controllable.
 * It uses a "resource:action:scope" pattern where scope is optional.
 * `own` is a special scope that implies ownership-based access.
 */
export const allPermissions = [
    // Listing Permissions
    'listing:create',
    'listing:read',
    'listing:update',
    'listing:delete',

    // Booking Permissions
    'booking:create',         // Admin/staff can book for any guest
    'booking:create:own',     // Guests can book for themselves
    'booking:read',           // Admins/staff can see all bookings
    'booking:read:own',       // Guests can see their own bookings
    'booking:update',         // Admins can update any aspect of a booking
    'booking:update:own',     // Guests can update limited fields of their own booking
    'booking:cancel',         // Admins can cancel any booking
    'booking:cancel:own',     // Guests can cancel their own bookings
    'booking:confirm',        // Admin/staff can confirm, check-in, or check-out bookings

    // User Permissions
    'user:create',
    'user:read',
    'user:update',
    'user:update:own',
    'user:delete',

    // Review Permissions
    'review:create:own',
    'review:approve',
    'review:delete',

    // Permission Management
    'permissions:update',

    // Dashboard Access
    'dashboard:read',
] as const;

// The `Permission` type is derived from the `allPermissions` array.
// This ensures that any string used as a permission must be one of the defined values.
export type Permission = typeof allPermissions[number];

export type Role = 'admin' | 'staff' | 'guest';
