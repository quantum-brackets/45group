

/**
 * @fileoverview This file contains all server-side data fetching functions.
 * These functions interact directly with the Supabase database to retrieve
 * data needed for rendering pages and components. They are designed to be
 * used within Server Components and Server Actions.
 */
import type { Listing, Booking, ListingType, User, ListingInventory, Review, BookingAction } from './types';
import { getSession } from '@/lib/session';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server';
import { preloadPermissions } from '@/lib/permissions/server';
import { hasPermission } from '@/lib/permissions';


/**
 * Helper function to unpack the 'data' JSONB field from a user record.
 * This simplifies the data structure by merging the JSONB fields with the top-level fields.
 * @param dbUser - The raw user object from the Supabase client.
 * @returns A flattened User object.
 */
const unpackUser = (dbUser: any): User => {
    if (!dbUser) return null as any;
    const { data, ...rest } = dbUser;
    return { ...rest, ...data };
};

/**
 * Helper function to unpack the 'data' JSONB field from a listing record.
 * It also calculates the `inventoryCount` from the related `listing_inventory` table.
 * @param dbListing - The raw listing object from Supabase.
 * @returns A flattened Listing object with an `inventoryCount`.
 */
const unpackListing = (dbListing: any): Listing => {
    if (!dbListing) return null as any;
    const { data, listing_inventory, ...rest } = dbListing;
    // The count is returned as an object in an array, e.g., [{ count: 5 }]
    const inventoryCount = listing_inventory ? (Array.isArray(listing_inventory) ? listing_inventory[0]?.count : 0) : 0;
    return { ...rest, ...data, inventoryCount };
};

/**
 * Helper function to unpack the 'data' JSONB field from a booking record.
 * It re-maps database column names (e.g., `listing_id`) to more idiomatic JS names (e.g., `listingId`).
 * @param dbBooking - The raw booking object from Supabase.
 * @returns A flattened Booking object.
 */
const unpackBooking = (dbBooking: any): Booking => {
    if (!dbBooking) return null as any;
    const { data, listing_id, user_id, start_date, end_date, ...rest } = dbBooking;

    // For backwards compatibility, derive `createdAt` from the actions array if not present.
    // New bookings will have `data.createdAt` directly.
    const createdAt = data?.createdAt || (data?.actions && data.actions.length > 0
        ? data.actions.find((a: BookingAction) => a.action === 'Created')?.timestamp
        : new Date(0).toISOString()); // Fallback for very old data with no actions

    return {
        ...rest,
        ...data,
        listingId: listing_id,
        userId: user_id,
        startDate: start_date,
        endDate: end_date,
        createdAt: createdAt,
    };
};

/**
 * Fetches a single user by their ID.
 * @param id - The UUID of the user.
 * @returns A User object or null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
    const supabase = createSupabaseServerClient();
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, status, data')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
    return unpackUser(user);
}

/**
 * Fetches all users in the system.
 * This is an admin/staff-only function.
 * @returns An array of User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    const perms = await preloadPermissions();
    // Use the admin client to bypass RLS for this internal dashboard function.
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    // Double-check permissions even though this is a server function.
    if (!session || !hasPermission(perms, session, 'user:read')) {
        return [];
    }
    
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role, status, data')
        .order('data->>name', { ascending: true });

    if (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
    return users.map(unpackUser);
}

/**
 * Fetches all unique listing types and a sample of images for each.
 * Used for the services section on the homepage.
 * @returns An array of objects, each with a service name and an array of image URLs.
 */
export async function getListingTypesWithSampleImages(): Promise<{ name: string, images: string[] }[]> {
    // Prevent this data from being cached, so it updates if new listings are added.
    noStore();
    const supabase = createSupabaseServerClient();
    
    // First, get all unique listing types.
    const { data: types, error: typesError } = await supabase
        .from('listings')
        .select('type')
        .order('type');

    if (typesError || !types) {
      console.error("Error fetching listing types:", typesError);
      return [];
    }
    
    // Then, for each unique type, fetch a few sample images.
    const uniqueTypes = [...new Set(types.map(t => t.type))];
    const servicesData: { name: string, images: string[] }[] = [];
    
    for (const listingType of uniqueTypes) {
        const { data: listingsForType, error: listingsError } = await supabase
            .from('listings')
            .select('data')
            .eq('type', listingType)
            .limit(5);

        if (listingsError) {
            console.error(`Error fetching listings for type ${listingType}:`, listingsError);
            continue;
        }
        
        const allImages = listingsForType.flatMap(listing => (listing.data.images as string[]) || []);
  
        if (allImages.length > 0) {
            const sampleImages = allImages.slice(0, 5);
            // The carousel component requires at least two images to work correctly.
            if (sampleImages.length === 1) {
                sampleImages.push(sampleImages[0]);
            }
            servicesData.push({
              name: listingType.charAt(0).toUpperCase() + listingType.slice(1),
              images: sampleImages
            });
        }
    }
    
    return servicesData;
}

/**
 * Fetches all listings, including their inventory count.
 * @returns An array of Listing objects.
 */
export async function getAllListings(): Promise<Listing[]> {
  const supabase = createSupabaseServerClient();
  // Fetch listings and a count of their related inventory in one query.
  const { data: listingsData, error: listingsError } = await supabase
    .from('listings')
    .select('id, type, location, data, listing_inventory(count)')
    .order('location')
    .order('type')
    .order('data->>name');
  
  if (listingsError) {
      console.error("Error fetching all listings:", listingsError);
      return [];
  }

  return listingsData.map(unpackListing);
}

/**
 * Fetches a specific set of listings by their IDs.
 * @param ids - An array of listing UUIDs.
 * @returns An array of Listing objects.
 */
export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('listings').select('id, type, location, data').in('id', ids);
  if (error) {
      console.error("Error fetching listings by IDs:", error);
      return [];
  }
  return data.map(l => unpackListing({ ...l, inventory_inventory: [] }));
}

/**
 * Fetches all inventory units for a specific listing.
 * @param listingId - The UUID of the listing.
 * @returns An array of ListingInventory objects.
 */
export async function getInventoryByListingId(listingId: string): Promise<ListingInventory[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('listing_inventory').select('*').eq('listing_id', listingId);
    if(error) {
        console.error("Error fetching inventory by listing ID:", error);
        return [];
    }
    return data as ListingInventory[];
}

/**
 * Fetches a single listing by its ID, including its inventory count.
 * @param id - The UUID of the listing.
 * @returns A Listing object or null if not found.
 */
export async function getListingById(id: string): Promise<Listing | null> {
  // Opt out of caching for this function, as listing details (especially reviews) can change often.
  noStore();
  const supabase = createSupabaseServerClient();
  
  const { data: listingData, error: listingError } = await supabase
    .from('listings')
    .select('id, type, location, data, listing_inventory(count)')
    .eq('id', id)
    .single();

  if (listingError) {
    console.error("Error fetching listing by ID:", listingError);
    return null;
  }
  
  return unpackListing(listingData);
}

/**
 * Fetches all bookings. The scope of bookings returned depends on the user's role.
 * Guests see their own bookings. Admins/staff see all bookings.
 * @returns An array of Booking objects, enriched with user and listing names.
 */
export async function getAllBookings(): Promise<Booking[]> {
    noStore();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
        return [];
    }
    
    const perms = await preloadPermissions();

    let query = supabase.from('bookings').select('id, listing_id, user_id, status, start_date, end_date, data');

    // Apply Row-Level Security (RLS) principle at the application layer.
    if (!hasPermission(perms, session, 'booking:read')) {
        query = query.eq('user_id', session.id);
    }
    
    const { data: bookingsData, error } = await query;

    if (error) {
        console.error("Error fetching all bookings:", error);
        return [];
    }
    if (!bookingsData || bookingsData.length === 0) {
        return [];
    }

    // Get all unique user and listing IDs to fetch their names in batch.
    const userIds = [...new Set(bookingsData.map(b => b.user_id))];
    const listingIds = [...new Set(bookingsData.map(b => b.listing_id))];

    // Fetch user and listing data in parallel.
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, data')
        .in('id', userIds);

    const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, data')
        .in('id', listingIds);
        
    if (usersError) console.error("Error fetching user names for bookings:", usersError);
    if (listingsError) console.error("Error fetching listing names for bookings:", listingsError);

    // Create maps for efficient lookup.
    const usersMap = new Map(usersData?.map(u => [u.id, u.data.name]));
    const listingsMap = new Map(listingsData?.map(l => [l.id, l.data.name]));
    
    const unpackedBookings = bookingsData.map(unpackBooking);

    // Enrich the booking objects with the fetched names.
    const mappedBookings = unpackedBookings.map((b) => ({
      ...b,
      userName: usersMap.get(b.userId),
      listingName: listingsMap.get(b.listingId) || 'Unknown Listing',
    }));

    // Apply a multi-level sort to the bookings.
    mappedBookings.sort((a, b) => {
        // 1. Sort by date (start_date) descending (newest first).
        const dateComparison = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        if (dateComparison !== 0) return dateComparison;

        // 2. Sort by status: Confirmed -> Pending -> Cancelled -> Checked Out.
        const statusOrder = { 'Confirmed': 1, 'Pending': 2, 'Cancelled': 3, 'Checked Out': 4 };
        const statusComparison = (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
        if (statusComparison !== 0) return statusComparison;

        // 3. Sort by booking name (Booking For) ascending.
        const nameComparison = (a.bookingName || '').localeCompare(b.bookingName || '');
        if (nameComparison !== 0) return nameComparison;

        // 4. Sort by venue (listingName) ascending.
        return (a.listingName || '').localeCompare(b.listingName || '');
    });
    
    return mappedBookings;
}

/**
 * Fetches a single, detailed booking by its ID.
 * @param id - The UUID of the booking.
 * @returns A fully enriched Booking object or null if not found or not permitted.
 */
export async function getBookingById(id: string): Promise<Booking | null> {
    noStore();
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
        return null;
    }
    
    // 1. Fetch the booking by ID.
    const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('id, listing_id, user_id, status, start_date, end_date, data')
        .eq('id', id)
        .single();

    if (error || !bookingData) {
        console.error("Error fetching booking by ID:", error);
        return null;
    }
    
    // RLS check at application level
    if (!hasPermission(perms, session, 'booking:read') && !hasPermission(perms, session, 'booking:read:own', { ownerId: bookingData.user_id })) {
        return null;
    }
    
    const unpackedBooking = unpackBooking(bookingData);

    // 2. Fetch related listing and user data in parallel.
    const { data: listingData } = await supabase
        .from('listings')
        .select('data')
        .eq('id', unpackedBooking.listingId)
        .single();

    const { data: userData } = await supabase
        .from('users')
        .select('data')
        .eq('id', unpackedBooking.userId)
        .single();
    
    // 3. Fetch inventory names for the booked units.
    let inventoryNames: string[] = [];
    if (unpackedBooking.inventoryIds && Array.isArray(unpackedBooking.inventoryIds) && unpackedBooking.inventoryIds.length > 0) {
        const { data: invData, error: invError } = await supabase
            .from('listing_inventory')
            .select('name')
            .in('id', unpackedBooking.inventoryIds);
        
        if (!invError) {
            inventoryNames = invData.map(item => item.name);
        }
    }

    // 4. Assemble the final, enriched booking object.
    return {
      ...unpackedBooking,
      listingName: listingData?.data.name || 'Unknown Listing',
      userName: userData?.data.name || 'Unknown User',
      inventoryNames: inventoryNames,
      userNotes: userData?.data.notes, // Include user notes for staff/admin view.
    };
}

// Interface for the search page filter values.
interface FilterValues {
  location: string;
  type: ListingType | '';
  guests: string;
  date?: { from: Date; to?: Date };
}

/**
 * Fetches listings based on a set of filters from the search page.
 * @param filters - An object containing the filter criteria.
 * @returns An array of filtered Listing objects.
 */
export async function getFilteredListings(filters: FilterValues): Promise<Listing[]> {
  noStore();
  const supabase = createSupabaseServerClient();
  
  // Start building the query.
  let query = supabase
    .from('listings')
    .select('id, type, location, data, listing_inventory(count)') 
    .order('location')
    .order('type')
    .order('data->>name');

  // Apply filters to the query.
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.guests && parseInt(filters.guests, 10) > 0) {
    // Note the `data->>max_guests` syntax for querying a JSONB field as text.
    query = query.gte('data->>max_guests', parseInt(filters.guests, 10));
  }

  const { data: listingsData, error } = await query;

  if (error) {
    console.error("Error fetching listings for filtering:", error);
    return [];
  }
  
  let listingsWithInventoryCount = listingsData.map(l => unpackListing(l));

  // If no date filter is applied, return the listings now.
  if (!filters.date?.from) {
    return listingsWithInventoryCount;
  }
  
  // --- Date-based filtering (if applicable) ---
  const listingIds = listingsWithInventoryCount.map(l => l.id);
  if (listingIds.length === 0) {
      return [];
  }

  const from = filters.date.from.toISOString();
  const to = (filters.date.to || filters.date.from).toISOString();

  // Find all confirmed bookings that overlap with the selected date range.
  const { data: overlappingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('listing_id, data')
      .in('listing_id', listingIds)
      .eq('status', 'Confirmed')
      .lte('start_date', to)
      .gte('end_date', from);

  if (bookingsError) {
      console.error("Error fetching bookings for date filter:", bookingsError);
      return listingsWithInventoryCount; // Return partially filtered results on error.
  }

  // Create a map of listing ID to a set of its booked inventory unit IDs.
  const bookedUnitsByListing: Record<string, Set<string>> = {};
  for (const booking of overlappingBookings) {
      if (!bookedUnitsByListing[booking.listing_id]) {
          bookedUnitsByListing[booking.listing_id] = new Set();
      }
      (booking.data.inventoryIds || []).forEach((invId: string) => bookedUnitsByListing[booking.listing_id].add(invId));
  }
  
  // Filter the listings to only include those with available units.
  const availableListings = listingsWithInventoryCount.filter(listing => {
      const totalInventory = listing.inventoryCount ?? 0;
      const bookedCount = bookedUnitsByListing[listing.id]?.size || 0;
      return totalInventory > bookedCount;
  });

  return availableListings;
}

/**
 * Fetches all confirmed bookings for a specific listing.
 * Used to calculate availability in the booking form.
 * @param listingId - The UUID of the listing.
 * @returns An array of objects containing start date, end date, and booked inventory IDs.
 */
export async function getConfirmedBookingsForListing(listingId: string) {
    noStore();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from('bookings')
        .select('start_date, end_date, data')
        .eq('listing_id', listingId)
        .eq('status', 'Confirmed');

    if (error) {
        console.error("Error fetching confirmed bookings:", error);
        return [];
    }
    
    // Return a minimal object for performance.
    return data.map(d => ({ 
        startDate: d.start_date, 
        endDate: d.end_date, 
        inventoryIds: d.data.inventoryIds || [] 
    }));
}
