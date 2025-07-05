import type { Listing, Booking, ListingType } from './types';
import { db } from './db';
import { DateRange } from 'react-day-picker';

// Helper to parse listing data from the database
function parseListing(listing: any): Listing {
  return {
    ...listing,
    images: JSON.parse(listing.images),
    reviews: JSON.parse(listing.reviews),
    features: JSON.parse(listing.features),
  };
}

export async function getAllListings(): Promise<Listing[]> {
  const stmt = db.prepare('SELECT * FROM listings');
  const listings = stmt.all() as any[];
  return listings.map(parseListing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const stmt = db.prepare('SELECT * FROM listings WHERE id = ?');
  const listing = stmt.get(id) as any;
  if (!listing) return null;
  return parseListing(listing);
}

export async function getAllBookings(): Promise<Booking[]> {
  const stmt = db.prepare('SELECT * FROM bookings ORDER BY startDate DESC');
  return stmt.all() as Booking[];
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const stmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
  const booking = stmt.get(id) as Booking | undefined;
  return booking || null;
}

interface FilterValues {
  location: string;
  type: ListingType | '';
  guests: string;
  date: DateRange | undefined;
}

export async function getFilteredListings(filters: FilterValues): Promise<Listing[]> {
  let query = 'SELECT * FROM listings';
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.location) {
    whereClauses.push('location LIKE ?');
    params.push(`%${filters.location}%`);
  }
  if (filters.type) {
    whereClauses.push('type = ?');
    params.push(filters.type);
  }
  if (filters.guests) {
    const numGuests = parseInt(filters.guests, 10);
    if (!isNaN(numGuests)) {
      whereClauses.push('maxGuests >= ?');
      params.push(numGuests);
    }
  }

  if (filters.date?.from) {
    const fromDate = filters.date.from.toISOString().split('T')[0];
    const toDate = (filters.date.to || filters.date.from).toISOString().split('T')[0];
    
    whereClauses.push(`
      id NOT IN (
        SELECT listingId FROM bookings
        WHERE status = 'Confirmed' AND (
          -- Overlap check: (StartA <= EndB) AND (EndA >= StartB)
          endDate >= ? AND startDate <= ?
        )
      )
    `);
    params.push(fromDate, toDate);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  const stmt = db.prepare(query);
  const listings = stmt.all(...params) as any[];
  return listings.map(parseListing);
}
