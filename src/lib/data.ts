
import type { Listing, Booking, ListingType, User } from './types';
import { getDb } from './db';
import { DateRange } from 'react-day-picker';
import { getSession } from '@/lib/session';
import { unstable_noStore as noStore } from 'next/cache';

// Helper to parse listing data from the database
function parseListing(listing: any): Listing {
  return {
    ...listing,
    images: JSON.parse(listing.images),
    reviews: JSON.parse(listing.reviews),
    features: JSON.parse(listing.features),
  };
}

export async function getUserById(id: string): Promise<User | null> {
    const db = await getDb();
    const stmt = db.prepare('SELECT id, name, email, role, status, notes, phone FROM users WHERE id = ?');
    const user = stmt.get(id) as User | undefined;
    return user || null;
}

export async function getAllUsers(): Promise<User[]> {
    const session = await getSession();
    if (session?.role !== 'admin' && session?.role !== 'staff') {
        return [];
    }
    const db = await getDb();
    // Include all users in the list, including the current admin.
    const stmt = db.prepare('SELECT id, name, email, role, status, notes, phone FROM users');
    return stmt.all() as User[];
}

export async function getAllListings(): Promise<Listing[]> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM listings ORDER BY location, type, name');
  const listings = stmt.all() as any[];
  return listings.map(parseListing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM listings WHERE id = ?');
  const listing = stmt.get(id) as any;
  if (!listing) return null;
  return parseListing(listing);
}

interface BookingsPageFilters {
  listingId?: string;
  userId?: string;
}

export async function getAllBookings(filters: BookingsPageFilters): Promise<Booking[]> {
    noStore();
    const session = await getSession();
    if (!session) {
        return [];
    }

    const db = await getDb();
    let query = `
        SELECT b.*, u.name as userName, l.name as listingName
        FROM bookings as b
        JOIN users as u ON b.userId = u.id
        JOIN listings as l ON b.listingId = l.id
    `;
    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    // For non-admin/staff users, they can only see their own bookings.
    if (session.role === 'guest') {
        whereClauses.push('b.userId = ?');
        params.push(session.id);
    } else if ((session.role === 'admin' || session.role === 'staff') && filters.userId) {
        // Admin or staff can filter by a specific user.
        whereClauses.push('b.userId = ?');
        params.push(filters.userId);
    }

    // This filter is available for everyone
    if (filters.listingId) {
        whereClauses.push('b.listingId = ?');
        params.push(filters.listingId);
    }
    
    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    query += ' ORDER BY b.startDate DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as Booking[];
}


export async function getBookingById(id: string): Promise<Booking | null> {
    const session = await getSession();
    if (!session) {
        return null;
    }
    
    const db = await getDb();
    const stmt = db.prepare(`
        SELECT b.*, l.name as listingName, u.name as userName
        FROM bookings as b
        JOIN listings as l on b.listingId = l.id
        JOIN users u ON b.userId = u.id
        WHERE b.id = ?
    `);
    const booking = stmt.get(id) as Booking | undefined;

    if (!booking) return null;

    // Admin/staff can view any booking, guests can only view their own
    if (session.role === 'guest' && booking.userId !== session.id) {
        return null;
    }

    return booking;
}

interface FilterValues {
  location: string;
  type: ListingType | '';
  guests: string;
  date: DateRange | undefined;
}

export async function getFilteredListings(filters: FilterValues): Promise<Listing[]> {
  noStore();
  const db = await getDb();
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

  query += ' ORDER BY location, type, name';

  const stmt = db.prepare(query);
  const listings = stmt.all(...params) as any[];
  return listings.map(parseListing);
}
