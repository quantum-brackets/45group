
import type { Listing, Booking, ListingType, User, ListingInventory, Review, BookingAction } from './types';
import { getSession } from '@/lib/session';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase';


// Helper function to unpack the 'data' JSONB field
const unpackUser = (dbUser: any): User => {
    if (!dbUser) return null as any;
    const { data, ...rest } = dbUser;
    return { ...rest, ...data };
};

const unpackListing = (dbListing: any): Listing => {
    if (!dbListing) return null as any;
    const { data, listing_inventory, ...rest } = dbListing;
    const inventoryCount = listing_inventory ? (Array.isArray(listing_inventory) ? listing_inventory[0]?.count : 0) : 0;
    return { ...rest, ...data, inventoryCount };
};

const unpackBooking = (dbBooking: any): Booking => {
    if (!dbBooking) return null as any;
    const { data, listing_id, user_id, start_date, end_date, ...rest } = dbBooking;

    // For backwards compatibility, derive from actions if not present.
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

export async function getAllUsers(): Promise<User[]> {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin' && session?.role !== 'staff') {
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

export async function getListingTypesWithSampleImages(): Promise<{ name: string, images: string[] }[]> {
    noStore();
    const supabase = createSupabaseServerClient();
    
    const { data: types, error: typesError } = await supabase
        .from('listings')
        .select('type')
        .order('type');

    if (typesError || !types) {
      console.error("Error fetching listing types:", typesError);
      return [];
    }
    
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

export async function getAllListings(): Promise<Listing[]> {
  const supabase = createSupabaseServerClient();
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

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('listings').select('id, type, location, data').in('id', ids);
  if (error) {
      console.error("Error fetching listings by IDs:", error);
      return [];
  }
  return data.map(unpackListing);
}

export async function getInventoryByListingId(listingId: string): Promise<ListingInventory[]> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from('listing_inventory').select('*').eq('listing_id', listingId);
    if(error) {
        console.error("Error fetching inventory by listing ID:", error);
        return [];
    }
    return data as ListingInventory[];
}

export async function getListingById(id: string): Promise<Listing | null> {
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

export async function getAllBookings(): Promise<Booking[]> {
    noStore();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
        return [];
    }

    let query = supabase.from('bookings').select('id, listing_id, user_id, status, start_date, end_date, data');

    if (session.role === 'guest') {
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

    const userIds = [...new Set(bookingsData.map(b => b.user_id))];
    const listingIds = [...new Set(bookingsData.map(b => b.listing_id))];

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

    const usersMap = new Map(usersData?.map(u => [u.id, u.data.name]));
    const listingsMap = new Map(listingsData?.map(l => [l.id, l.data.name]));
    
    const unpackedBookings = bookingsData.map(unpackBooking);

    const mappedBookings = unpackedBookings.map((b) => ({
      ...b,
      userName: usersMap.get(b.userId),
      listingName: listingsMap.get(b.listingId) || 'Unknown Listing',
    }));

    // Apply the requested multi-level sorting logic
    mappedBookings.sort((a, b) => {
        // 1. Sort by date (start_date) descending (newest first)
        const dateComparison = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        if (dateComparison !== 0) return dateComparison;

        // 2. Sort by status: Confirmed -> Pending -> Cancelled
        const statusOrder = { 'Confirmed': 1, 'Pending': 2, 'Cancelled': 3 };
        const statusComparison = (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
        if (statusComparison !== 0) return statusComparison;

        // 3. Sort by booking name (Booking For) ascending
        const nameComparison = (a.bookingName || '').localeCompare(b.bookingName || '');
        if (nameComparison !== 0) return nameComparison;

        // 4. Sort by venue (listingName) ascending
        return (a.listingName || '').localeCompare(b.listingName || '');
    });
    
    return mappedBookings;
}


export async function getBookingById(id: string): Promise<Booking | null> {
    noStore();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
        return null;
    }
    
    // 1. Fetch the booking by ID
    const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('id, listing_id, user_id, status, start_date, end_date, data')
        .eq('id', id)
        .single();

    if (error || !bookingData) {
        console.error("Error fetching booking by ID:", error);
        return null;
    }
    
    // RLS check
    if (session.role === 'guest' && bookingData.user_id !== session.id) {
        return null;
    }
    
    const unpackedBooking = unpackBooking(bookingData);

    // 2. Fetch related listing and user names
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
    
    // 3. Fetch inventory names
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

    // 4. Assemble the final booking object
    return {
      ...unpackedBooking,
      listingName: listingData?.data.name || 'Unknown Listing',
      userName: userData?.data.name || 'Unknown User',
      inventoryNames: inventoryNames,
      userNotes: userData?.data.notes,
    };
}

interface FilterValues {
  location: string;
  type: ListingType | '';
  guests: string;
  date?: { from: Date; to?: Date };
}

export async function getFilteredListings(filters: FilterValues): Promise<Listing[]> {
  noStore();
  const supabase = createSupabaseServerClient();
  
  let query = supabase
    .from('listings')
    .select('id, type, location, data, listing_inventory(id)')
    .order('location')
    .order('type')
    .order('data->>name');

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.guests && parseInt(filters.guests, 10) > 0) {
    query = query.gte('data->>max_guests', parseInt(filters.guests, 10));
  }

  const { data: listingsData, error } = await query;

  if (error) {
    console.error("Error fetching listings for filtering:", error);
    return [];
  }
  
  let listingsWithInventoryCount = listingsData.map(l => ({
    ...unpackListing(l),
    inventoryCount: l.listing_inventory.length,
  }));

  if (!filters.date?.from) {
    return listingsWithInventoryCount;
  }
  
  const listingIds = listingsWithInventoryCount.map(l => l.id);
  if (listingIds.length === 0) {
      return [];
  }

  const from = filters.date.from.toISOString();
  const to = (filters.date.to || filters.date.from).toISOString();

  const { data: overlappingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('listing_id, data')
      .in('listing_id', listingIds)
      .eq('status', 'Confirmed')
      .lte('start_date', to) // booking starts before or on the same day the search range ends
      .gte('end_date', from); // booking ends after or on the same day the search range starts

  if (bookingsError) {
      console.error("Error fetching bookings for date filter:", bookingsError);
      return listingsWithInventoryCount;
  }

  const bookedUnitsByListing: Record<string, Set<string>> = {};
  for (const booking of overlappingBookings) {
      if (!bookedUnitsByListing[booking.listing_id]) {
          bookedUnitsByListing[booking.listing_id] = new Set();
      }
      (booking.data.inventoryIds || []).forEach((invId: string) => bookedUnitsByListing[booking.listing_id].add(invId));
  }
  
  const availableListings = listingsWithInventoryCount.filter(listing => {
      const totalInventory = listing.inventoryCount;
      const bookedCount = bookedUnitsByListing[listing.id]?.size || 0;
      return totalInventory > bookedCount;
  });

  return availableListings;
}

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
    
    return data.map(d => ({ 
        startDate: d.start_date, 
        endDate: d.end_date, 
        inventoryIds: d.data.inventoryIds || [] 
    }));
}
