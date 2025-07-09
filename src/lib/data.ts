
import type { Listing, Booking, ListingType, User, ListingInventory, Review } from './types';
import { getSession } from '@/lib/session';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from './supabase';

export async function getUserById(id: string): Promise<User | null> {
    const supabase = createSupabaseServerClient();
    const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, notes, phone')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
    return user as User | null;
}

export async function getAllUsers(): Promise<User[]> {
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin' && session?.role !== 'staff') {
        return [];
    }
    
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, notes, phone');

    if (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
    return users as User[];
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
            .select('images')
            .eq('type', listingType)
            .limit(5);

        if (listingsError) {
            console.error(`Error fetching listings for type ${listingType}:`, listingsError);
            continue;
        }

        const allImages = listingsForType.flatMap(listing => (listing.images as string[]) || []);
  
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
    .select('*, listing_inventory(count)')
    .order('location')
    .order('type')
    .order('name');
  
  if (listingsError) {
      console.error("Error fetching all listings:", listingsError);
      return [];
  }

  return listingsData.map((l: any) => ({
      ...l,
      inventoryCount: l.listing_inventory[0]?.count || 0,
      listing_inventory: undefined, // clean up
  })) as Listing[];
}

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('listings').select('*').in('id', ids);
  if (error) {
      console.error("Error fetching listings by IDs:", error);
      return [];
  }
  return data as Listing[];
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
    .select('*, listing_inventory(count)')
    .eq('id', id)
    .single();

  if (listingError) {
    console.error("Error fetching listing by ID:", listingError);
    return null;
  }
  
  const listing = {
      ...listingData,
      inventoryCount: listingData.listing_inventory[0]?.count || 0,
      listing_inventory: undefined, // clean up
  };
  
  return listing as Listing;
}

interface BookingsPageFilters {
  listingId?: string;
  userId?: string;
}

export async function getAllBookings(filters: BookingsPageFilters): Promise<Booking[]> {
    noStore();
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (!session) {
        return [];
    }

    let query = supabase.from('bookings').select('*');

    if (session.role === 'guest') {
        query = query.eq('user_id', session.id);
    } else if ((session.role === 'admin' || session.role === 'staff') && filters.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters.listingId) {
        query = query.eq('listing_id', filters.listingId);
    }
    
    const { data: bookingsData, error } = await query.order('start_date', { ascending: false });

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
        .select('id, name')
        .in('id', userIds);

    const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, name')
        .in('id', listingIds);
        
    if (usersError) console.error("Error fetching user names for bookings:", usersError);
    if (listingsError) console.error("Error fetching listing names for bookings:", listingsError);

    const usersMap = new Map(usersData?.map(u => [u.id, u.name]));
    const listingsMap = new Map(listingsData?.map(l => [l.id, l.name]));

    return bookingsData.map((b) => ({
      id: b.id,
      listingId: b.listing_id,
      inventoryIds: b.inventory_ids,
      userId: b.user_id,
      startDate: b.start_date,
      endDate: b.end_date,
      guests: b.guests,
      status: b.status,
      createdAt: b.created_at,
      actionByUserId: b.action_by_user_id,
      actionAt: b.action_at,
      statusMessage: b.status_message,
      userName: usersMap.get(b.user_id),
      listingName: listingsMap.get(b.listing_id) || 'Unknown Listing',
    })) as Booking[];
}


export async function getBookingById(id: string): Promise<Booking | null> {
    noStore();
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (!session) {
        return null;
    }
    
    // 1. Fetch the booking by ID
    const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('*')
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

    // 2. Fetch related listing and user names
    const { data: listingData } = await supabase
        .from('listings')
        .select('name')
        .eq('id', bookingData.listing_id)
        .single();

    const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', bookingData.user_id)
        .single();
    
    // 3. Fetch inventory names
    let inventoryNames: string[] = [];
    if (bookingData.inventory_ids && Array.isArray(bookingData.inventory_ids) && bookingData.inventory_ids.length > 0) {
        const { data: invData, error: invError } = await supabase
            .from('listing_inventory')
            .select('name')
            .in('id', bookingData.inventory_ids);
        
        if (!invError) {
            inventoryNames = invData.map(item => item.name);
        }
    }

    // 4. Assemble the final booking object
    const booking: Booking = {
      id: bookingData.id,
      listingId: bookingData.listing_id,
      inventoryIds: bookingData.inventory_ids,
      userId: bookingData.user_id,
      startDate: bookingData.start_date,
      endDate: bookingData.end_date,
      guests: bookingData.guests,
      status: bookingData.status,
      createdAt: bookingData.created_at,
      actionByUserId: bookingData.action_by_user_id,
      actionAt: bookingData.action_at,
      statusMessage: bookingData.status_message,
      listingName: listingData?.name || 'Unknown Listing',
      userName: userData?.name || 'Unknown User',
      inventoryNames: inventoryNames,
    };

    return booking;
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
    .select('*, listing_inventory(id)');

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.guests && parseInt(filters.guests, 10) > 0) {
    query = query.gte('max_guests', parseInt(filters.guests, 10));
  }

  const { data: listingsData, error } = await query;

  if (error) {
    console.error("Error fetching listings for filtering:", error);
    return [];
  }
  
  let listingsWithInventoryCount = listingsData.map(l => ({
    ...l,
    inventoryCount: l.listing_inventory.length,
    listing_inventory: undefined, // remove to clean up
  }));

  if (!filters.date?.from) {
    return listingsWithInventoryCount as Listing[];
  }
  
  const listingIds = listingsWithInventoryCount.map(l => l.id);
  if (listingIds.length === 0) {
      return [];
  }

  const from = filters.date.from.toISOString();
  const to = (filters.date.to || filters.date.from).toISOString();

  const { data: overlappingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('listing_id, inventory_ids')
      .in('listing_id', listingIds)
      .eq('status', 'Confirmed')
      .lte('start_date', to) // booking starts before or on the same day the search range ends
      .gte('end_date', from); // booking ends after or on the same day the search range starts

  if (bookingsError) {
      console.error("Error fetching bookings for date filter:", bookingsError);
      return listingsWithInventoryCount as Listing[];
  }

  const bookedUnitsByListing: Record<string, Set<string>> = {};
  for (const booking of overlappingBookings) {
      if (!bookedUnitsByListing[booking.listing_id]) {
          bookedUnitsByListing[booking.listing_id] = new Set();
      }
      booking.inventory_ids.forEach(invId => bookedUnitsByListing[booking.listing_id].add(invId));
  }
  
  const availableListings = listingsWithInventoryCount.filter(listing => {
      const totalInventory = listing.inventoryCount;
      const bookedCount = bookedUnitsByListing[listing.id]?.size || 0;
      return totalInventory > bookedCount;
  });

  return availableListings as Listing[];
}

export async function getConfirmedBookingsForListing(listingId: string) {
    noStore();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from('bookings')
        .select('start_date, end_date, inventory_ids')
        .eq('listing_id', listingId)
        .eq('status', 'Confirmed');

    if (error) {
        console.error("Error fetching confirmed bookings:", error);
        return [];
    }
    
    return data as { startDate: string, endDate: string, inventoryIds: string[] }[];
}
