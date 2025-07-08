
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
  const { data, error } = await supabase
    .from('listings')
    .select(`
        *,
        inventoryCount:listing_inventory(count)
    `)
    .order('location')
    .order('type')
    .order('name');
  
  if (error) {
      console.error("Error fetching all listings:", error);
      return [];
  }
  
  // The count is returned as an array of objects, so we need to flatten it.
  return data.map((l: any) => ({
      ...l,
      inventoryCount: l.inventoryCount[0]?.count || 0,
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
    const { data, error } = await supabase.from('listing_inventory').select('*').eq('listingId', listingId);
    if(error) {
        console.error("Error fetching inventory by listing ID:", error);
        return [];
    }
    return data as ListingInventory[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  noStore();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
        *,
        inventoryCount:listing_inventory(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching listing by ID:", error);
    return null;
  }
  
  const listing = {
      ...data,
      inventoryCount: data.inventoryCount[0]?.count || 0
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

    let query = supabase
        .from('bookings')
        .select(`
            *,
            userName:users(name),
            listingName:listings(name)
        `);

    if (session.role === 'guest') {
        query = query.eq('userId', session.id);
    } else if ((session.role === 'admin' || session.role === 'staff') && filters.userId) {
        query = query.eq('userId', filters.userId);
    }

    if (filters.listingId) {
        query = query.eq('listingId', filters.listingId);
    }
    
    const { data, error } = await query.order('startDate', { ascending: false });

    if (error) {
        console.error("Error fetching all bookings:", error);
        return [];
    }

    // Flatten the joined user and listing names
    return data.map((b: any) => ({
        ...b,
        userName: b.userName?.name,
        listingName: b.listingName?.name,
    })) as Booking[];
}


export async function getBookingById(id: string): Promise<Booking | null> {
    noStore();
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (!session) {
        return null;
    }
    
    const { data: bookingData, error } = await supabase
        .from('bookings')
        .select(`
            *,
            listing:listings(name),
            user:users(id, name)
        `)
        .eq('id', id)
        .single();

    if (error || !bookingData) {
        console.error("Error fetching booking by ID:", error);
        return null;
    }
    
    if (session.role === 'guest' && bookingData.userId !== session.id) {
        return null;
    }
    
    let inventoryNames: string[] = [];
    if (bookingData.inventoryIds && Array.isArray(bookingData.inventoryIds) && bookingData.inventoryIds.length > 0) {
        const { data: invData, error: invError } = await supabase
            .from('listing_inventory')
            .select('name')
            .in('id', bookingData.inventoryIds);
        
        if (!invError) {
            inventoryNames = invData.map(item => item.name);
        }
    }

    const booking: Booking = {
        ...bookingData,
        listingName: (bookingData.listing as any)?.name,
        userName: (bookingData.user as any)?.name,
        inventoryNames: inventoryNames,
    }

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
  
  const { data, error } = await supabase.rpc('get_filtered_listings', {
      location_filter: filters.location || null,
      type_filter: filters.type || null,
      guests_filter: filters.guests ? parseInt(filters.guests, 10) : null,
      from_date_filter: filters.date?.from ? filters.date.from.toISOString() : null,
      to_date_filter: filters.date?.to ? filters.date.to.toISOString() : (filters.date?.from ? filters.date.from.toISOString() : null),
  });

  if (error) {
    console.error("Error fetching filtered listings:", error);
    return [];
  }
  return data as Listing[];
}

export async function getConfirmedBookingsForListing(listingId: string) {
    noStore();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
        .from('bookings')
        .select('startDate, endDate, inventoryIds')
        .eq('listingId', listingId)
        .eq('status', 'Confirmed');

    if (error) {
        console.error("Error fetching confirmed bookings:", error);
        return [];
    }
    
    return data as { startDate: string, endDate: string, inventoryIds: string[] }[];
}
