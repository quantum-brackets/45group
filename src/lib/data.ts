
import type { Listing, Booking, ListingType, User, ListingInventory } from './types';
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

export async function getListingTypesWithSampleImages(): Promise<{ name: string, images: string[] }[]> {
    noStore();
    const db = await getDb();
    
    // 1. Get all unique listing types, ordered for consistency
    const types = db.prepare('SELECT DISTINCT type FROM listings ORDER BY type').all() as { type: ListingType }[];
    
    if (!types || types.length === 0) {
      return [];
    }
    
    const servicesData: { name: string, images: string[] }[] = [];
    
    // 2. For each type, get a sample of images
    for (const typeInfo of types) {
      const listingType = typeInfo.type;
      
      const listingsForType = db.prepare('SELECT images FROM listings WHERE type = ?').all(listingType) as { images: string }[];
      
      const allImages = listingsForType.flatMap(listing => {
          try {
              // Images are stored as a JSON string array, so parse them
              return JSON.parse(listing.images);
          } catch (e) {
              console.error(`Error parsing images for a listing of type ${listingType}:`, e);
              return []; // Return empty array on parse error to avoid crashing
          }
      });
  
      if (allImages.length > 0) {
        // Shuffle the images array to get a random sample
        for (let i = allImages.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
        }
        
        // Take up to 5 images for the carousel display.
        const sampleImages = allImages.slice(0, 5);

        // The carousel component looks best with at least 2 images.
        // If we only have one, we duplicate it.
        if (sampleImages.length === 1) {
            sampleImages.push(sampleImages[0]);
        }
        
        servicesData.push({
          name: listingType.charAt(0).toUpperCase() + listingType.slice(1),
          images: sampleImages
        });
      } else {
          // Fallback with placeholder images if no images are found for this type
          servicesData.push({
              name: listingType.charAt(0).toUpperCase() + listingType.slice(1),
              images: [
                  'https://placehold.co/400x600.png',
                  'https://placehold.co/400x600.png',
                  'https://placehold.co/400x600.png',
              ]
          });
      }
    }
    
    return servicesData;
}

export async function getAllListings(): Promise<Listing[]> {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT l.*, COUNT(i.id) as inventoryCount
    FROM listings l
    LEFT JOIN listing_inventory i ON l.id = i.listingId
    GROUP BY l.id
    ORDER BY l.location, l.type, l.name
  `);
  const listings = stmt.all() as any[];
  return listings.map(parseListing);
}

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) {
    return [];
  }
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM listings WHERE id IN (${placeholders})`);
  const listings = stmt.all(...ids) as any[];
  return listings.map(parseListing);
}

export async function getInventoryByListingId(listingId: string): Promise<ListingInventory[]> {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM listing_inventory WHERE listingId = ?');
    return stmt.all(listingId) as ListingInventory[];
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
    const bookingRows = stmt.all(...params) as any[];

    return bookingRows.map(row => {
        const inventoryIds = row.inventoryIds ? JSON.parse(row.inventoryIds) : [];
        delete row.inventoryIds;
        return {
            ...row,
            inventoryIds,
        };
    });
}


export async function getBookingById(id: string): Promise<Booking | null> {
    noStore();
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
    const bookingData = stmt.get(id) as any;

    if (!bookingData) return null;

    // Admin/staff can view any booking, guests can only view their own
    if (session.role === 'guest' && bookingData.userId !== session.id) {
        return null;
    }

    const inventoryIds = bookingData.inventoryIds ? JSON.parse(bookingData.inventoryIds) : [];
    let inventoryNames: string[] = [];

    if (inventoryIds.length > 0) {
        const placeholders = inventoryIds.map(() => '?').join(',');
        const inventoryStmt = db.prepare(`SELECT name FROM listing_inventory WHERE id IN (${placeholders})`);
        const results = inventoryStmt.all(...inventoryIds) as { name: string }[];
        inventoryNames = results.map(item => item.name);
    }

    const booking: Booking = {
        id: bookingData.id,
        listingId: bookingData.listingId,
        userId: bookingData.userId,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        guests: bookingData.guests,
        status: bookingData.status,
        listingName: bookingData.listingName,
        userName: bookingData.userName,
        createdAt: bookingData.createdAt,
        actionByUserId: bookingData.actionByUserId,
        actionAt: bookingData.actionAt,
        statusMessage: bookingData.statusMessage,
        inventoryIds: inventoryIds,
        inventoryNames: inventoryNames,
    };

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
  let query = 'SELECT * FROM listings l';
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.location) {
    whereClauses.push('l.location LIKE ?');
    params.push(`%${filters.location}%`);
  }
  if (filters.type) {
    whereClauses.push('l.type = ?');
    params.push(filters.type);
  }
  if (filters.guests) {
    const numGuests = parseInt(filters.guests, 10);
    if (!isNaN(numGuests)) {
      whereClauses.push('l.maxGuests >= ?');
      params.push(numGuests);
    }
  }

  if (filters.date?.from) {
    const fromDate = filters.date.from.toISOString().split('T')[0];
    const toDate = (filters.date.to || filters.date.from).toISOString().split('T')[0];
    
    whereClauses.push(`
      (SELECT COUNT(*) FROM listing_inventory WHERE listingId = l.id) >
      (SELECT COUNT(DISTINCT je.value) 
       FROM bookings b, json_each(b.inventoryIds) je
       JOIN listing_inventory i ON i.id = je.value
       WHERE i.listingId = l.id
       AND b.status = 'Confirmed'
       AND (b.endDate >= ? AND b.startDate <= ?))
    `);
    params.push(fromDate, toDate);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY l.location, l.type, l.name';

  const stmt = db.prepare(query);
  const listings = stmt.all(...params) as any[];
  return listings.map(parseListing);
}
