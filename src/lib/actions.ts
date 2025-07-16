/**
 * @fileoverview This file contains all the "Server Actions" for the application.
 * Server Actions are asynchronous functions that are only executed on the server.
 * They can be called directly from client components (forms, button clicks, etc.),
 * which eliminates the need to create separate API endpoints for data mutations.
 *
 * Each action typically performs the following steps:
 * 1. Checks user session and permissions.
 * 2. Validates incoming data using Zod schemas.
 * 3. Interacts with the database (Supabase) to perform CRUD operations.
 * 4. Uses `revalidatePath` or `revalidateTag` to update the Next.js cache and refresh the UI.
 * 5. Returns a structured response, usually `{ success: boolean, message: string }`.
 *
 * Using server actions centralizes business logic, improves security by keeping sensitive
 * operations on the server, and simplifies the overall architecture.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession, logout as sessionLogout } from '@/lib/session'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/password'
import type { Booking, Listing, ListingInventory, Role, Review, User, BookingAction, Bill, Payment, Permission } from '@/lib/types'
import { randomUUID } from 'crypto'
import { sendBookingConfirmationEmail, sendBookingRequestEmail, sendBookingSummaryEmail, sendWelcomeEmail } from '@/lib/email'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { preloadPermissions } from '@/lib/permissions/server'
import { hasPermission } from '@/lib/permissions'


function unpackUser(user: any): User {
    if (!user) return null as any;
    const { data, ...rest } = user;
    return { ...rest, ...data };
}

function unpackListing(listing: any): Listing {
    if (!listing) return null as any;
    const { data, ...rest } = listing;
    return { ...rest, ...data };
}

function unpackBooking(booking: any): Booking {
    if (!booking) return null as any;
    const { data, listing_id, user_id, start_date, end_date, ...rest } = booking;
    return { ...rest, ...data, listingId: listing_id, userId: user_id, startDate: start_date, endDate: end_date };
}

/**
 * Updates the permissions for all roles in the system.
 * This is an admin-only action.
 * @param permissions - An object where keys are roles and values are arrays of permission strings.
 * @returns A result object indicating success or failure.
 */
export async function updatePermissionsAction(permissions: Record<Role, Permission[]>) {
    const perms = await preloadPermissions();
    const session = await getSession();
    // Security: Ensure the user has permission to update permissions.
    if (!session || !hasPermission(perms, session, 'permissions:update')) {
      return { success: false, message: 'Permission Denied: You are not authorized to update roles and permissions.' };
    }
  
    const supabase = createSupabaseAdminClient();
    
    // Prepare the data for a bulk `upsert` operation.
    const updates = Object.entries(permissions).map(([role, perms]) => ({
      role: role,
      data: { permissions: perms }
    }));

    // Upsert atomically updates existing roles or inserts new ones.
    const { error } = await supabase.from('role_permissions').upsert(updates, { onConflict: 'role' });
  
    if (error) {
      console.error('Error saving permissions:', error);
      return { success: false, message: `Database Error: Failed to save permissions. ${error.message}` };
    }
  
    // Invalidate the cache for the permissions page to show the new data.
    revalidatePath('/dashboard/permissions');
    return { success: true, message: 'Permissions updated successfully.' };
  }


// Zod schema for validating data from the listing creation/update form.
// This ensures data integrity before it reaches the database.
const ListingFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(['hotel', 'events', 'restaurant'], { required_error: "Type is required."}),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  price_unit: z.enum(['night', 'hour', 'person'], { required_error: "Price unit is required."}),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN'], { required_error: "Currency is required."}),
  max_guests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
  images: z.array(z.string().url({ message: "Please enter a valid image URL." })).min(1, "At least one image is required."),
  // Inventory is an array of objects, allowing for dynamic addition/removal of units.
  inventory: z.array(
    z.object({
      id: z.string().optional(), // `id` is present when updating an existing unit.
      name: z.string().min(1, "Unit name cannot be empty."),
    })
  ).min(0, "There must be at least 0 units."),
});


/**
 * Creates a new listing and its associated inventory units.
 * @param data - The listing data, validated against ListingFormSchema.
 * @returns A result object indicating success or failure.
 */
export async function createListingAction(data: z.infer<typeof ListingFormSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    // Security: Check permissions.
    if (!session || !hasPermission(perms, session, 'listing:create')) {
        return { success: false, message: 'Permission Denied: You are not authorized to create new listings.' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Validation Error: Please check the form for invalid data.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory } = validatedFields.data;
    
    // Data is stored in a JSONB column for flexibility.
    const listingJsonData = {
        name, description, price, price_unit, currency, max_guests, 
        features: features.split(',').map(f => f.trim()), // Convert comma-separated string to array
        images,
        rating: 0, // Initialize rating
        reviews: [], // Initialize reviews
    };

    // Insert the main listing record.
    const { data: newListing, error: listingError } = await supabase.from('listings').insert({
        type,
        location,
        data: listingJsonData
    }).select('id').single();

    if (listingError || !newListing) {
        console.error('[CREATE_LISTING_ACTION] Error creating listing:', listingError);
        return { success: false, message: `Database Error: Failed to create listing. ${listingError?.message}` };
    }

    // If inventory units were provided, insert them into the inventory table.
    if (inventory.length > 0) {
        const inventoryItems = inventory.map(item => ({
            listing_id: newListing.id,
            name: item.name,
        }));
        const { error: inventoryError } = await supabase.from('listing_inventory').insert(inventoryItems);
        if (inventoryError) {
            console.error('[CREATE_LISTING_ACTION] Error creating inventory:', inventoryError);
            // Rollback: If inventory fails, delete the listing to prevent partial data.
            await supabase.from('listings').delete().eq('id', newListing.id);
            return { success: false, message: `Database Error: Failed to create inventory. ${inventoryError.message}` };
        }
    }
    
    // Revalidate the dashboard path to show the new listing.
    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: `Listing "${name}" has been created with ${inventory.length} units.` };
}

/**
 * Updates an existing listing and reconciles its inventory.
 * @param id - The ID of the listing to update.
 * @param data - The updated listing data.
 * @returns A result object indicating success or failure.
 */
export async function updateListingAction(id: string, data: z.infer<typeof ListingFormSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, 'listing:update')) {
    return { success: false, message: 'Permission Denied: You are not authorized to update listings.' };
  }
  
  const validatedFields = ListingFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // Fetch the existing listing to preserve fields not in the form (like reviews and rating).
  const { data: existingListing, error: fetchError } = await supabase
    .from('listings')
    .select('data')
    .eq('id', id)
    .single();

  if (fetchError || !existingListing) {
      return { success: false, message: 'Database Error: Could not find the listing to update.' };
  }
  
  const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory: formInventory } = validatedFields.data;

  // Merge new form data with existing data to prevent overwriting reviews/ratings.
  const listingJsonData = {
      ...existingListing.data,
      name, description, price, price_unit, currency, max_guests,
      features: features.split(',').map(f => f.trim()),
      images,
  };

  const { error: updateError } = await supabase.from('listings').update({
      type, location, data: listingJsonData
  }).eq('id', id);

  if (updateError) {
    console.error(`[UPDATE_LISTING_ACTION] Error updating listing: ${updateError.message}`);
    return { success: false, message: `Database Error: Failed to update listing. ${updateError.message}` };
  }

  // --- Smart Inventory Reconciliation Logic ---
  // This logic determines which inventory items need to be created, updated, or deleted.
  const { data: dbInventory } = await supabase.from('listing_inventory').select('id, name').eq('listing_id', id);
  const dbInventoryMap = new Map((dbInventory || []).map(i => [i.id, i.name]));
  const formInventoryMap = new Map(formInventory.filter(i => i.id).map(i => [i.id!, i.name]));

  // Find what to create, update, or delete by comparing the form state to the DB state.
  const itemsToCreate = formInventory.filter(i => !i.id);
  const itemsToUpdate = formInventory.filter(i => i.id && dbInventoryMap.has(i.id) && dbInventoryMap.get(i.id) !== i.name);
  const idsToDelete = (dbInventory || []).filter(i => !formInventoryMap.has(i.id)).map(i => i.id);

  // Safety check: Prevent deletion of inventory units tied to active bookings.
  if (idsToDelete.length > 0) {
      const { data: bookedInv, error: bookedError } = await supabase
        .from('bookings').select('data').eq('listing_id', id).in('status', ['Pending', 'Confirmed']);
      if (bookedError) return { success: false, message: `Database Error: Failed to check for active bookings. ${bookedError.message}` };

      const bookedIds = new Set(bookedInv.flatMap(b => b.data.inventoryIds || []));
      const isBookedItemDeleted = idsToDelete.some(id => bookedIds.has(id));

      if (isBookedItemDeleted) {
          return { success: false, message: 'Update Failed: Cannot delete inventory units that are part of an active or pending booking.' };
      }
  }

  // Batch all database operations to run in parallel.
  const operations = [];
  if (itemsToCreate.length > 0) {
    operations.push(supabase.from('listing_inventory').insert(itemsToCreate.map(i => ({ listing_id: id, name: i.name }))));
  }
  if (itemsToUpdate.length > 0) {
    itemsToUpdate.forEach(item => {
      operations.push(supabase.from('listing_inventory').update({ name: item.name }).eq('id', item.id!));
    });
  }
  if (idsToDelete.length > 0) {
    operations.push(supabase.from('listing_inventory').delete().in('id', idsToDelete));
  }
  
  const results = await Promise.all(operations);
  const firstError = results.find(r => r.error);

  if (firstError?.error) {
      console.error('[UPDATE_LISTING_ACTION] Inventory update error:', firstError.error);
      return { success: false, message: `Database Error: Failed to update inventory. ${firstError.error.message}` };
  }

  // Revalidate all relevant paths.
  revalidatePath('/dashboard?tab=listings', 'page');
  revalidatePath(`/listing/${id}`);
  revalidatePath('/bookings');
  
  return { success: true, message: `The details for "${name}" have been saved.` };
}

/**
 * Deletes a listing and its associated inventory.
 * @param id - The ID of the listing to delete.
 * @returns A result object indicating success or failure.
 */
export async function deleteListingAction(id: string) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, 'listing:delete')) {
    return { success: false, message: 'Permission Denied: You are not authorized to delete listings.' };
  }
  
  // Safety check: Prevent deletion if there are active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .in('status', ['Pending', 'Confirmed'])
    .limit(1);

  if (bookingCheckError) {
    return { success: false, message: `Database Error: Failed to check for active bookings. ${bookingCheckError.message}` };
  }
  if (activeBookings && activeBookings.length > 0) {
    return { success: false, message: 'Deletion Failed: Cannot delete a listing with active or pending bookings. Please cancel them first.' };
  }

  // The database is set up with cascading deletes, so deleting the listing
  // will also delete its inventory units.
  const { error } = await supabase.from('listings').delete().eq('id', id);

  if (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: `Database Error: Failed to delete listing. ${error.message}` };
  }

  revalidatePath('/dashboard?tab=listings', 'page');
  return { success: true, message: 'Listing and all its inventory have been deleted.' };
}

const CreateBookingSchema = z.object({
    listingId: z.string(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
    guests: z.coerce.number().int().min(1, "At least one guest is required."),
    numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
    userId: z.string().optional(),
    guestName: z.string().optional(),
    guestEmail: z.string().email().optional().or(z.literal('')),
    guestNotes: z.string().optional(),
  }).superRefine((data, ctx) => {
      // This is a guest checkout (or new user booking by staff).
      // We only need a name. Email is optional.
      if (!data.userId && !data.guestName) {
          ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Guest name is required for new guests.",
              path: ['guestName']
          });
      }
  });


/**
 * Helper function to find available inventory units for a given listing and date range.
 * @param supabase - The Supabase client instance.
 * @param listingId - The ID of the listing.
 * @param startDate - The start date of the desired booking.
 * @param endDate - The end date of the desired booking.
 * @param excludeBookingId - An optional booking ID to exclude from the check (used when updating a booking).
 * @returns An array of available inventory IDs.
 */
async function findAvailableInventory(supabase: any, listingId: string, startDate: string, endDate: string, excludeBookingId?: string): Promise<string[]> {
    // Get all inventory units for the listing.
    const { data: allInventory, error: invError } = await supabase
        .from('listing_inventory')
        .select('id')
        .eq('listing_id', listingId);

    if (invError) throw new Error('Database Error: Could not fetch inventory.');

    const allInventoryIds = allInventory.map((inv: any) => inv.id);

    // Find all confirmed bookings that overlap with the requested date range.
    let bookingsQuery = supabase
        .from('bookings')
        .select('data')
        .eq('listing_id', listingId)
        .eq('status', 'Confirmed') // Only `Confirmed` bookings block availability.
        .lte('start_date', endDate) // A booking that starts before or on the day the new one ends.
        .gte('end_date', startDate); // A booking that ends after or on the day the new one starts.
    
    // If we are updating a booking, we need to exclude it from the check.
    if (excludeBookingId) {
        bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }
        
    const { data: overlappingBookings, error: bookingsError } = await bookingsQuery;
    
    if (bookingsError) throw new Error('Database Error: Could not check for overlapping bookings.');
    
    // Get a set of all inventory IDs that are booked during the overlapping period.
    const bookedInventoryIds = new Set(overlappingBookings.flatMap((b: any) => b.data.inventoryIds || []));
    
    // Return the list of inventory IDs that are not booked.
    return allInventoryIds.filter((id: string) => !bookedInventoryIds.has(id));
}

type FindOrCreateResult = {
    userId: string;
    userName: string;
    userEmail?: string;
    isNewUser: boolean;
    error?: string;
}

/**
 * Finds an existing user or creates a new provisional one.
 * This centralized function is used by both the booking and user creation flows.
 * @param supabase - The Supabase admin client.
 * @param name - The name of the guest.
 * @param email - The optional email of the guest.
 * @param notes - Optional notes to add to the new user's profile.
 * @returns A result object with user details or an error message.
 */
async function findOrCreateGuestUser(
    supabase: any,
    name: string,
    email?: string | null,
    notes?: string | null
): Promise<FindOrCreateResult> {
    if (email) {
        const lowerCaseEmail = email.toLowerCase();
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, status, data')
            .eq('email', lowerCaseEmail)
            .single();

        if (existingUser) {
            if (existingUser.status === 'active') {
                return { error: 'An active account with this email already exists. Please select them from the "Existing Customer" dropdown or ask them to log in.', isNewUser: false, userId: '', userName: '' };
            }
            // If provisional, we can proceed with this user.
            return { userId: existingUser.id, userName: existingUser.data.name || name, userEmail: lowerCaseEmail, isNewUser: false };
        }
    }
    
    // If no existing user was found (or if no email was provided), create a new one.
    const placeholderEmail = email ? email.toLowerCase() : `walk-in-booking-${randomUUID()}@45group.org`;
    const dataPayload: { name: string; notes?: string } = { name };
    if (notes) {
        dataPayload.notes = notes;
    }
    
    const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ email: placeholderEmail, role: 'guest', status: 'provisional', data: dataPayload })
        .select('id')
        .single();

    if (insertError || !newUser) {
        console.error('Error creating provisional user:', insertError);
        return { error: 'Database Error: Could not create a provisional guest account.', isNewUser: false, userId: '', userName: '' };
    }
    
    return { userId: newUser.id, userName: name, userEmail: email ? email.toLowerCase() : undefined, isNewUser: true };
}

/**
 * Creates a new booking. Handles logged-in users, admins booking for guests, and new guest checkouts.
 * @param data - The booking data.
 * @returns A result object indicating success or failure.
 */
export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).map(e => e?.[0]).filter(Boolean).join(', ');
      return { success: false, message: `Validation Error: ${errorMessages || 'Please check your input.'}` };
  }

  const { listingId, startDate, endDate, guests, numberOfUnits, userId, guestName, guestNotes } = validatedFields.data;
  const guestEmail = validatedFields.data.guestEmail ? validatedFields.data.guestEmail.toLowerCase() : undefined;
  
  let finalUserId: string;
  let finalUserName: string;
  let finalUserEmail: string | undefined;
  let isNewUser = false;
  let actorId: string;
  let actorName: string;

  if (session) {
    actorId = session.id;
    actorName = session.name;

    // Case 1: Staff/Admin booking for an existing user.
    if (userId) {
        if (!hasPermission(perms, session, 'booking:create')) return { success: false, message: 'Permission Denied' };
        const { data: targetUser, error: targetUserError } = await supabase.from('users').select('email, data').eq('id', userId).single();
        if (targetUserError || !targetUser) return { success: false, message: 'Booking Failed: The selected guest user could not be found.' };
        finalUserId = userId;
        finalUserName = targetUser.data.name;
        finalUserEmail = targetUser.email;
    // Case 2: Staff/Admin booking for a NEW guest (with or without email).
    } else if (guestName) {
        if (!hasPermission(perms, session, 'booking:create')) return { success: false, message: 'Permission Denied' };
        const result = await findOrCreateGuestUser(supabase, guestName, guestEmail, guestNotes);
        if (result.error) return { success: false, message: result.error };
        finalUserId = result.userId;
        finalUserName = result.userName;
        finalUserEmail = result.userEmail;
        isNewUser = result.isNewUser;
    // Case 3: User booking for themselves.
    } else {
        if (!hasPermission(perms, session, 'booking:create:own', { ownerId: session.id })) return { success: false, message: 'Permission Denied' };
        finalUserId = session.id;
        finalUserName = session.name;
        finalUserEmail = session.email;
    }
  } else {
    // Case 4: Unauthenticated guest checkout.
    if (!guestName || !guestEmail) return { success: false, message: "Validation Error: Guest name and email are required for guest checkout." };
    actorName = guestName;
    const result = await findOrCreateGuestUser(supabase, guestName, guestEmail, guestNotes);
    if (result.error) return { success: false, message: result.error };
    finalUserId = result.userId;
    finalUserName = result.userName;
    finalUserEmail = result.userEmail;
    isNewUser = result.isNewUser;
    actorId = finalUserId; // For guest checkout, the guest is the actor.
  }
  
  try {
      const availableInventory = await findAvailableInventory(supabase, listingId, startDate, endDate);
      if (availableInventory.length < numberOfUnits) {
          return { success: false, message: `Booking Failed: Not enough units available for the selected dates. Only ${availableInventory.length} left.` };
      }
      const inventoryToBook = availableInventory.slice(0, numberOfUnits);
      
      const createdAt = new Date().toISOString();
      const isBookingForOther = session && session.id !== finalUserId;
      
      const message = hasPermission(perms, session, 'booking:create') && isBookingForOther
        ? `Booking created by staff member ${actorName} on behalf of ${finalUserName}.`
        : 'Booking request received.';

      const initialAction: BookingAction = {
        timestamp: createdAt,
        actorId: actorId,
        actorName: actorName,
        action: 'Created',
        message: message
      };

      const bookingData = {
          guests,
          bookingName: finalUserName,
          inventoryIds: inventoryToBook,
          actions: [initialAction],
          createdAt: createdAt,
          bills: [],
          payments: [],
          discount: 0,
      };

      const { data: newBooking, error: createBookingError } = await supabase.from('bookings').insert({
          listing_id: listingId,
          user_id: finalUserId,
          start_date: startDate,
          end_date: endDate,
          status: 'Pending',
          data: bookingData
      }).select().single();

      if (createBookingError || !newBooking) throw createBookingError;
      
      const userForEmail = { name: finalUserName, email: finalUserEmail, id: finalUserId };

      if (finalUserEmail && !finalUserEmail.includes('@45group.org')) {
        if (isNewUser) {
            await sendWelcomeEmail({ name: userForEmail.name, email: userForEmail.email! });
        }
        const { data: listingData } = await supabase.from('listings').select('data').eq('id', listingId).single();
        if(listingData) {
            const tempFullUser: User = { ...userForEmail, role: 'guest', status: 'provisional', name: userForEmail.name, email: userForEmail.email! };
            await sendBookingRequestEmail(tempFullUser, unpackBooking(newBooking), unpackListing({ ...listingData, id: listingId }));
        }
      }

      revalidatePath('/bookings');
      revalidatePath(`/listing/${listingId}`);

      if (session) {
        return { success: true, message: 'Your booking request has been sent and is pending confirmation.' };
      } else {
        return { success: true, message: 'Your booking request has been sent! Check your email to complete your account setup.' };
      }

  } catch (e: any) {
      return { success: false, message: `Booking Failed: ${e.message}` };
  }
}

// Zod schema for validating booking update data.
const UpdateBookingSchema = z.object({
  bookingId: z.string(),
  bookingName: z.string().min(1, "Booking name is required."),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
  userId: z.string().optional(),
  inventoryIds: z.array(z.string()).optional(),
});

/**
 * Updates an existing booking.
 * @param data - The updated booking data.
 * @returns A result object indicating success or failure.
 */
export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) return { success: false, message: 'Authentication Error: You must be logged in to perform this action.' };
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Validation Error: Please check the form for invalid data." };

    const { bookingId, startDate, endDate, guests, numberOfUnits, bookingName, userId, inventoryIds } = validatedFields.data;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('user_id, listing_id, data, status, start_date, end_date')
      .eq('id', bookingId)
      .single();
      
    if (fetchError || !booking) return { success: false, message: 'Database Error: Could not find the booking to update.' };

    const canUpdate = hasPermission(perms, session, 'booking:update:own', { ownerId: booking.user_id }) || hasPermission(perms, session, 'booking:update');
    const canReassignUnits = session.role === 'admin' || session.role === 'staff';

    if (!canUpdate) {
      return { success: false, message: 'Permission Denied: You are not authorized to update this booking.' };
    }

    const ownerChanged = userId && userId !== booking.user_id;

    if (ownerChanged && !hasPermission(perms, session, 'booking:update')) {
        return { success: false, message: 'Permission Denied: You are not authorized to change the owner of a booking.' };
    }

    // Determine if critical fields have changed, which may require re-confirmation.
    const existingStartDate = new Date(booking.start_date).toISOString();
    const existingEndDate = new Date(booking.end_date).toISOString();
    const existingNumberOfUnits = (booking.data.inventoryIds || []).length;
    const existingInventoryIds = new Set<string>(booking.data.inventoryIds || []);
    const newInventoryIds = new Set<string>(inventoryIds || []);
    const unitsChanged = inventoryIds ? !(existingInventoryIds.size === newInventoryIds.size && [...existingInventoryIds].every(id => newInventoryIds.has(id))) : (numberOfUnits !== existingNumberOfUnits);

    const datesChanged = startDate !== existingStartDate || endDate !== existingEndDate;
    

    let newStatus = booking.status;
    let successMessage: string;
    const actions: BookingAction[] = [...(booking.data.actions || [])];

    // If a confirmed booking is changed, it must be re-confirmed.
    if (booking.status === 'Confirmed' && (datesChanged || unitsChanged)) {
        newStatus = 'Pending';
        successMessage = 'Booking has been updated and is now pending re-confirmation.';
        actions.push({
            timestamp: new Date().toISOString(),
            actorId: session.id,
            actorName: session.name,
            action: 'Updated',
            message: 'Booking updated. Awaiting re-confirmation due to date/unit changes.',
        });
    } else {
        successMessage = 'Booking has been updated successfully.';
         actions.push({
            timestamp: new Date().toISOString(),
            actorId: session.id,
            actorName: session.name,
            action: 'Updated',
            message: 'Booking details updated.',
        });
    }

    if (ownerChanged) {
        const { data: newUser } = await supabase.from('users').select('data->>name as name').eq('id', userId!).single() as { data: User };
        if (!newUser || !newUser.name) {
            return { success: false, message: 'Database Error: The selected new owner does not exist or has no name.' };
        }
        actions.push({
            timestamp: new Date().toISOString(),
            actorId: session.id,
            actorName: session.name,
            action: 'Updated',
            message: `Booking owner changed to ${newUser.name}.`,
        });
    }

    try {
        let inventoryToBook = booking.data.inventoryIds;
        // If units were changed (either by number or by selection), we need to validate them.
        if (datesChanged || unitsChanged) {
             // Re-check inventory availability for the new dates, excluding the current booking.
            const availableInventory = await findAvailableInventory(supabase, booking.listing_id, startDate, endDate, bookingId);
            const availableInventorySet = new Set(availableInventory);
            
            if (canReassignUnits && inventoryIds) {
                if (inventoryIds.length !== numberOfUnits) return { success: false, message: `Update Failed: You must select exactly ${numberOfUnits} unit(s).` };
                const allSelectedAreAvailable = inventoryIds.every(id => availableInventorySet.has(id) || existingInventoryIds.has(id));
                if (!allSelectedAreAvailable) {
                    return { success: false, message: `Update Failed: One or more selected units are not available for the new dates.` };
                }
                inventoryToBook = inventoryIds;
            } else {
                 if (availableInventory.length < numberOfUnits) {
                    return { success: false, message: `Update Failed: Not enough units available for the new dates. Only ${availableInventory.length} left.` };
                }
                inventoryToBook = availableInventory.slice(0, numberOfUnits);
            }
        }
        
        const updatePayload: {
            start_date: string;
            end_date: string;
            status: string;
            data: any;
            user_id?: string;
        } = {
            start_date: startDate,
            end_date: endDate,
            status: newStatus,
            data: {
                ...booking.data,
                guests,
                inventoryIds: inventoryToBook,
                bookingName: bookingName,
                actions: actions,
            },
        };
        
        if (ownerChanged) {
            updatePayload.user_id = userId;
        }

        const { error } = await supabase.from('bookings').update(updatePayload).eq('id', bookingId);
        
        if (error) throw error;
        
        revalidatePath('/bookings');
        revalidatePath(`/booking/${bookingId}`);
        return { success: true, message: successMessage };
    } catch(e: any) {
        return { success: false, message: `Update Failed: ${e.message}` };
    }
}

/**
 * Logs the user out by destroying their session cookie.
 * @param from - The path to redirect to after logout.
 */
export async function logoutAction(from: string) {
    await sessionLogout();
    redirect(from);
}

// Simple schema for actions that only need a booking ID.
const BookingActionSchema = z.object({
  bookingId: z.string(),
});

/**
 * Cancels a booking.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function cancelBookingAction(data: z.infer<typeof BookingActionSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session) return { error: 'Authentication Error: You must be logged in to perform this action.' };

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('user_id, listing_id, data').eq('id', bookingId).single();
  if (fetchError || !booking) return { error: 'Database Error: Could not find the booking to cancel.' };

  if (!hasPermission(perms, session, 'booking:cancel:own', { ownerId: booking.user_id }) && !hasPermission(perms, session, 'booking:cancel')) {
    return { error: 'Permission Denied: You are not authorized to cancel this booking.' };
  }
  
  const { data: listing } = await supabase.from('listings').select('data').eq('id', booking.listing_id).single();
  
  // Add a "Cancelled" action to the booking's history.
  const cancelAction: BookingAction = {
    timestamp: new Date().toISOString(),
    actorId: session.id,
    actorName: session.name,
    action: 'Cancelled',
    message: `Booking cancelled by ${session.name}.`
  };

  const { error } = await supabase.from('bookings').update({
    status: 'Cancelled',
    data: {
      ...booking.data,
      actions: [...(booking.data.actions || []), cancelAction]
    }
  }).eq('id', bookingId);
  
  if (error) return { error: `Database Error: Failed to cancel booking. ${error.message}` };

  revalidatePath('/bookings');
  revalidatePath(`/booking/${bookingId}`);
  
  return { success: `Booking for ${listing?.data.name || 'listing'} has been cancelled.` };
}

/**
 * Calculates the total bill and payment balance for a booking.
 * @param booking - The booking object.
 * @param listing - The associated listing object.
 * @returns An object with `totalBill`, `totalPayments`, and `balance`.
 */
function calculateBookingBalance(booking: Booking, listing: Listing) {
    const from = parseISO(booking.startDate);
    const to = parseISO(booking.endDate);
    const units = (booking.inventoryIds || []).length;
    const guests = booking.guests;

    const durationDays = differenceInCalendarDays(to, from) + 1;
    const nights = durationDays > 1 ? durationDays - 1 : 1;
    
    let baseBookingCost = 0;
    switch(listing.price_unit) {
        case 'night':
            baseBookingCost = listing.price * nights * units;
            break;
        case 'hour':
            baseBookingCost = listing.price * durationDays * 8 * units;
            break;
        case 'person':
            baseBookingCost = listing.price * guests * units;
            break;
    }

    const addedBillsTotal = (booking.bills || []).reduce((sum, bill) => sum + bill.amount, 0);
    const totalBill = baseBookingCost + addedBillsTotal;
    const totalPayments = (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
    const balance = totalBill - totalPayments;

    return { totalBill, totalPayments, balance };
}


/**
 * Confirms a pending booking.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'booking:confirm')) {
      return { error: 'Permission Denied: You are not authorized to confirm bookings.' };
    }
  
    const { bookingId } = BookingActionSchema.parse(data);
  
    const { data: booking, error: fetchError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if(fetchError || !booking) return { error: 'Database Error: Could not find the booking to confirm.' };

    const unpackedBooking = unpackBooking(booking);

    // Fetch listing to calculate bill
    const { data: listingData } = await supabase.from('listings').select('id, data').eq('id', unpackedBooking.listingId).single();
    if(!listingData) return { error: 'Database Error: Could not find the associated listing.' };
    const unpackedListing = unpackListing(listingData);
    
    // Check payment status for staff AND ADMINS
    if (session.role === 'staff' || session.role === 'admin') {
        const { totalPayments } = calculateBookingBalance(unpackedBooking, unpackedListing);
        
        let depositRequired = 0;
        const units = (unpackedBooking.inventoryIds || []).length;

        switch(unpackedListing.price_unit) {
            case 'night':
                depositRequired = unpackedListing.price * 1 * units; // 1 night
                break;
            case 'hour':
                depositRequired = unpackedListing.price * 1 * units; // 1 hour
                break;
            case 'person':
                depositRequired = unpackedListing.price * 1 * units; // 1 person
                break;
        }

        if (totalPayments < depositRequired) {
            return { error: `Action Blocked: A deposit of at least ${new Intl.NumberFormat('en-US', { style: 'currency', currency: unpackedListing.currency || 'USD' }).format(depositRequired)} is required to confirm.` };
        }
    }

    try {
        // Final availability check at the moment of confirmation to prevent race conditions.
        const availableInventory = await findAvailableInventory(supabase, booking.listing_id, booking.start_date, booking.end_date, bookingId);
        
        const currentlyHeldIds = new Set(booking.data.inventoryIds || []);
        const stillAvailable = availableInventory.filter(id => currentlyHeldIds.has(id));

        // If the units assigned to this pending booking are no longer available, cancel it.
        if (stillAvailable.length < (booking.data.inventoryIds || []).length) {
            const systemCancelAction: BookingAction = {
                timestamp: new Date().toISOString(),
                actorId: 'system',
                actorName: 'System',
                action: 'System',
                message: 'Booking automatically cancelled due to inventory conflict during confirmation.'
            };

            await supabase.from('bookings').update({
                status: 'Cancelled',
                data: {
                    ...booking.data,
                    actions: [...(booking.data.actions || []), systemCancelAction]
                }
            }).eq('id', bookingId);
            revalidatePath('/bookings');
            revalidatePath(`/booking/${bookingId}`);
            return { error: 'Confirmation Failed: An inventory conflict was detected. The booking has been automatically cancelled.' };
        }

        const confirmAction: BookingAction = {
            timestamp: new Date().toISOString(),
            actorId: session.id,
            actorName: session.name,
            action: 'Confirmed',
            message: `Booking confirmed by ${session.name}.`
        };

        const { error } = await supabase.from('bookings').update({
            status: 'Confirmed',
            data: {
                ...booking.data,
                actions: [...(booking.data.actions || []), confirmAction]
            }
        }).eq('id', bookingId);

        if (error) throw error;
        
        // Send confirmation email
        const { data: userData } = await supabase.from('users').select('*').eq('id', booking.user_id).single();

        if (listingData && userData) {
            await sendBookingConfirmationEmail(unpackUser(userData), unpackedBooking, unpackedListing);
        }

        revalidatePath('/bookings');
        revalidatePath(`/booking/${bookingId}`);
        return { success: `Booking has been confirmed.` };
    } catch (e: any) {
        return { error: `Confirmation Failed: ${e.message}` };
    }
}

/**
 * Marks a booking as completed.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function completeBookingAction(data: z.infer<typeof BookingActionSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'booking:confirm')) {
        return { error: 'Permission Denied: You are not authorized to complete bookings.' };
    }
    
    const { bookingId } = BookingActionSchema.parse(data);
    
    const { data: bookingData, error: fetchError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (fetchError || !bookingData) {
        return { error: 'Database Error: Could not find the booking to complete.' };
    }

    const unpackedBooking = unpackBooking(bookingData);

    const { data: listingData } = await supabase.from('listings').select('id, data').eq('id', unpackedBooking.listingId).single();
    if(!listingData) return { error: 'Database Error: Could not find the associated listing.' };
    const unpackedListing = unpackListing(listingData);
    
    if (session.role === 'staff' || session.role === 'admin') {
        const { balance } = calculateBookingBalance(unpackedBooking, unpackedListing);
        if (balance > 0) {
            return { error: 'Action Blocked: Cannot complete a booking with an outstanding balance.' };
        }
    }
    
    const completeAction: BookingAction = {
        timestamp: new Date().toISOString(),
        actorId: session.id,
        actorName: session.name,
        action: 'Completed',
        message: `Booking marked as completed by ${session.name}.`
    };

    const updatedBookingData = {
        ...bookingData.data,
        actions: [...(bookingData.data.actions || []), completeAction]
    };
    
    const { error } = await supabase.from('bookings').update({
        status: 'Completed',
        data: updatedBookingData
    }).eq('id', bookingId);
    
    if (error) {
        return { error: `Database Error: Failed to complete booking. ${error.message}` };
    }

    // Send summary email
    const { data: userData } = await supabase.from('users').select('*').eq('id', unpackedBooking.userId).single();
    if (userData) {
        // We need to pass the *final* booking state to the email, including the 'Completed' action.
        await sendBookingSummaryEmail(unpackUser(userData), { ...unpackedBooking, ...{ data: updatedBookingData } }, unpackedListing);
    }
    
    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);
    return { success: 'Booking has been marked as completed.' };
}

// Zod schema for adding/updating users.
const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  role: z.enum(['admin', 'guest', 'staff']),
  status: z.enum(['active', 'disabled', 'provisional']),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Adds a new user to the system.
 * @param data - The user data.
 * @returns A result object indicating success or failure.
 */
export async function addUserAction(data: z.infer<typeof UserFormSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
  
    if (!session || !hasPermission(perms, session, 'user:create')) {
      return { success: false, message: 'Permission Denied: You are not authorized to create new users.' };
    }
  
    const validatedFields = UserFormSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Validation Error: Please check the form for invalid data." };
  
    const { name, password, role: initialRole, status, notes, phone } = validatedFields.data;
    const email = validatedFields.data.email ? validatedFields.data.email.toLowerCase() : undefined;
    
    let role = initialRole;
    if (session.role === 'staff') {
        role = 'guest'; // Staff can only create guests.
    }
  
    if (email && !password) return { success: false, message: "Validation Error: Password is required if an email is provided." };

    // Use the centralized helper to create the user.
    const result = await findOrCreateGuestUser(supabase, name, email, notes);
    if (result.error) return { success: false, message: result.error };

    const userJsonData: {name: string, notes?: string, phone?: string, password?: string} = { name, notes, phone };
    if (password) {
        userJsonData.password = await hashPassword(password);
    }
    
    const { error } = await supabase.from('users').update({ 
        role, 
        status: email && password ? status : 'provisional', // Ensure status is provisional if no credentials
        data: userJsonData 
    }).eq('id', result.userId);

    if (error) return { success: false, message: `Database Error: Failed to create user. ${error.message}` };
  
    if (result.isNewUser && email) {
      await sendWelcomeEmail({ name, email });
    }
  
    revalidatePath('/dashboard?tab=users', 'page');
    return { success: true, message: `User "${name}" was created successfully.` };
}

/**
 * Updates an existing user's details.
 * @param id - The ID of the user to update.
 * @param data - The updated user data.
 * @returns A result object indicating success or failure.
 */
export async function updateUserAction(id: string, data: z.infer<typeof UserFormSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, 'user:update')) {
    return { success: false, message: 'Permission Denied: You are not authorized to update user details.' };
  }

  const validatedFields = UserFormSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: "Validation Error: Please check the form for invalid data." };
  
  const { data: existingUser, error: fetchError } = await supabase.from('users').select('data, email, role, status').eq('id', id).single();
  if(fetchError || !existingUser) return { success: false, message: 'Database Error: Could not find the user to update.' };

  const { name, password, role, status, notes, phone } = validatedFields.data;
  const email = validatedFields.data.email ? validatedFields.data.email.toLowerCase() : '';

  // Check if any data has actually changed to avoid unnecessary database writes.
  const hasChanged =
    existingUser.data.name !== name ||
    existingUser.email !== email ||
    !!password ||
    existingUser.role !== role ||
    existingUser.status !== status ||
    (existingUser.data.phone || '') !== (phone || '') ||
    (existingUser.data.notes || '') !== (notes || '');
    
  if (!hasChanged) {
      return { success: true, message: "No changes were detected.", changesMade: false };
  }

  let userJsonData = { ...existingUser.data, name, notes, phone };
  
  // Only hash and update the password if a new one was provided.
  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update({ email, role, status, data: userJsonData }).eq('id', id);

  if (error) return { success: false, message: `Database Error: Failed to update user. ${error.message}` };

  revalidatePath('/dashboard?tab=users', 'page');
  revalidatePath(`/dashboard/edit-user/${id}`);
  
  return { success: true, message: `User "${name}" was updated successfully.`, changesMade: true };
}

/**
 * Deletes a user from the system.
 * @param userId - The ID of the user to delete.
 * @returns A result object indicating success or failure.
 */
export async function deleteUserAction(userId: string) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, 'user:delete')) {
    return { success: false, message: 'Permission Denied: You are not authorized to delete users.' };
  }

  // Safety check: Prevent users from deleting themselves.
  if (userId === session.id) {
    return { success: false, message: "Deletion Failed: You cannot delete your own account." };
  }

  // Safety check: Prevent deleting users with active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['Pending', 'Confirmed'])
    .limit(1);

  if (bookingCheckError) {
    return { success: false, message: `Database Error: Failed to check for active bookings. ${bookingCheckError.message}` };
  }
  
  if (activeBookings && activeBookings.length > 0) {
    return { success: false, message: 'Deletion Failed: This user has active or pending bookings and cannot be deleted.' };
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    console.error(`[DELETE_USER_ACTION] Error: ${error}`);
    return { success: false, message: `Database Error: Failed to delete user. ${error.message}` };
  }

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: 'User has been successfully deleted.' };
}

// Zod schema for the user's own profile update form.
const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Updates the profile of the currently logged-in user.
 * @param data - The updated profile data.
 * @returns A result object indicating success or failure.
 */
export async function updateUserProfileAction(data: z.infer<typeof UpdateProfileSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session) return { success: false, message: 'Authentication Error: You must be logged in to perform this action.' };
  
  if (!hasPermission(perms, session, 'user:update:own', { ownerId: session.id })) {
    return { success: false, message: 'Permission Denied: You are not authorized to update your profile.'}
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: "Validation Error: Please check the form for invalid data." };

  const { data: existingUser, error: fetchError } = await supabase.from('users').select('data').eq('id', session.id).single();
  if (fetchError || !existingUser) return { success: false, message: 'Database Error: Could not find your user profile.' };
  
  const { name, password, notes, phone } = validatedFields.data;
  const email = validatedFields.data.email.toLowerCase();
  let userJsonData = { ...existingUser.data, name, notes, phone };

  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update({ email, data: userJsonData }).eq('id', session.id);
  if (error) return { success: false, message: `Database Error: Failed to update profile. ${error.message}` };
  
  revalidatePath('/profile');
  revalidatePath('/', 'layout'); // Revalidate layout to update header with new user name/email.
  
  return { success: true, message: `Your profile has been updated successfully.` };
}

// Zod schema for review submissions.
const ReviewSchema = z.object({
    listingId: z.string(),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().min(10, "Comment must be at least 10 characters long.")
});

/**
 * Adds a new review or updates an existing one for a listing.
 * @param data - The review data.
 * @returns A result object indicating success or failure.
 */
export async function addOrUpdateReviewAction(data: z.infer<typeof ReviewSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) return { success: false, message: 'Authentication Error: You must be logged in to submit a review.' };
    
    if (!hasPermission(perms, session, 'review:create:own', { ownerId: session.id })) {
      return { success: false, message: 'Permission Denied: You are not authorized to create or update reviews.'};
    }

    const validatedFields = ReviewSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Validation Error: Please check the form for invalid data." };

    const { listingId, rating, comment } = validatedFields.data;
    
    // Fetch the listing to update its `reviews` array in the JSONB data.
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: `Database Error: Could not find the listing.` };

    const reviews = (listing.data.reviews || []) as Review[];
    const existingReviewIndex = reviews.findIndex(r => r.user_id === session.id);

    // All new reviews are 'pending' until approved by an admin.
    const newReviewData: Review = {
        id: existingReviewIndex > -1 ? reviews[existingReviewIndex].id : randomUUID(),
        user_id: session.id,
        author: session.name,
        avatar: `https://avatar.vercel.sh/${session.email}.png`,
        rating: rating,
        comment: comment,
        status: 'pending',
    };

    // If the user already has a review, replace it. Otherwise, add the new one.
    if (existingReviewIndex > -1) {
        reviews[existingReviewIndex] = newReviewData;
    } else {
        reviews.push(newReviewData);
    }
    
    // TODO: This could be moved to a database trigger for consistency.
    // When a review is added/updated, we update the entire reviews array in the listing's data.
    const { error: updateError } = await supabase.from('listings').update({ data: { ...listing.data, reviews: reviews } }).eq('id', listingId);
    if (updateError) return { success: false, message: `Database Error: Failed to submit review. ${updateError.message}` };

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Your review has been submitted and is awaiting approval.' };
}

// Schema for actions that operate on a specific review.
const ReviewActionSchema = z.object({
  listingId: z.string(),
  reviewId: z.string(),
});

/**
 * Approves a pending review.
 * @param data - The listing and review IDs.
 * @returns A result object indicating success or failure.
 */
export async function approveReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'review:approve')) return { success: false, message: 'Permission Denied: You are not authorized to approve reviews.' };

    const { listingId, reviewId } = data;
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: 'Database Error: Could not find the listing.' };

    const reviews = (listing.data.reviews || []) as Review[];
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);
    if (reviewIndex === -1) return { success: false, message: 'Action Failed: The review could not be found.' };

    reviews[reviewIndex].status = 'approved';

    // Recalculate the listing's average rating based on all approved reviews.
    // TODO: This is another candidate for a database trigger to ensure it's always in sync.
    const approvedReviews = reviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;
    
    const updatedData = { ...listing.data, reviews: reviews, rating: newAverageRating };

    const { error: updateError } = await supabase.from('listings').update({ data: updatedData }).eq('id', listingId);
    if (updateError) return { success: false, message: `Database Error: Failed to approve review. ${updateError.message}` };

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review approved successfully.' };
}

/**
 * Deletes a review.
 * @param data - The listing and review IDs.
 * @returns A result object indicating success or failure.
 */
export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'review:delete')) return { success: false, message: 'Permission Denied: You are not authorized to delete reviews.' };
    
    const { listingId, reviewId } = data;
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: 'Database Error: Could not find the listing.' };
    
    const reviews = (listing.data.reviews || []) as Review[];
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    
    // Recalculate average rating after deletion.
    const approvedReviews = updatedReviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;

    const updatedData = { ...listing.data, reviews: updatedReviews, rating: newAverageRating };

    const { error: updateError } = await supabase.from('listings').update({ data: updatedData }).eq('id', listingId);
    if (updateError) return { success: false, message: `Database Error: Failed to delete review. ${updateError.message}` };

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review deleted successfully.' };
}

// Zod schema for toggling a user's status.
const ToggleUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['active', 'disabled']),
});

/**
 * Toggles a user's status between 'active' and 'disabled'.
 * @param data - The user ID and new status.
 * @returns A result object indicating success or failure.
 */
export async function toggleUserStatusAction(data: z.infer<typeof ToggleUserStatusSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, 'user:update')) {
    return { success: false, message: 'Permission Denied: You are not authorized to change user statuses.' };
  }

  const { userId, status } = ToggleUserStatusSchema.parse(data);
  // Safety check: Prevent users from disabling themselves.
  if (userId === session.id) return { success: false, message: "Action Failed: You cannot change your own status." };
  
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) return { success: false, message: `Database Error: ${error.message}` };

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: `User status has been updated to ${status}.` };
}

// Zod schema for bulk deleting listings.
const BulkDeleteListingsSchema = z.object({
  listingIds: z.array(z.string()).min(1, "At least one listing must be selected for deletion."),
});

/**
 * Deletes multiple listings at once.
 * @param data - An object containing an array of listing IDs.
 * @returns A result object indicating success or failure.
 */
export async function bulkDeleteListingsAction(data: z.infer<typeof BulkDeleteListingsSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'listing:delete')) {
        return { success: false, message: 'Permission Denied: You are not authorized to delete listings.' };
    }

    const { listingIds } = BulkDeleteListingsSchema.parse(data);

    // Safety check: Ensure none of the selected listings have active bookings.
    const { data: activeBookings, error: bookingCheckError } = await supabase
      .from('bookings')
      .select('listing_id')
      .in('listing_id', listingIds)
      .in('status', ['Pending', 'Confirmed'])
      .limit(1);

    if(bookingCheckError) return { success: false, message: `Database Error: ${bookingCheckError.message}` };
    if(activeBookings && activeBookings.length > 0) return { success: false, message: `Deletion Failed: One or more selected listings have active bookings. Please cancel them first.` };

    const { error } = await supabase.from('listings').delete().in('id', listingIds);
    if (error) return { success: false, message: `Database Error: Failed to delete listings. ${error.message}` };
    
    revalidatePath('/dashboard');
    return { success: true, message: `${listingIds.length} listing(s) have been deleted.` };
}

// Zod schema for adding a new bill to a booking.
const AddBillSchema = z.object({
  bookingId: z.string(),
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

/**
 * Adds a new bill item to a booking's financial record.
 * @param data - The bill details.
 * @returns A result object indicating success or failure.
 */
export async function addBillAction(data: z.infer<typeof AddBillSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  
  if (!session || !hasPermission(perms, session, 'booking:update')) {
    return { success: false, message: 'Permission Denied: You are not authorized to add bills to a booking.' };
  }

  const validatedFields = AddBillSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Validation Error: Please check the form for invalid data." };
  }

  const { bookingId, description, amount } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('data').eq('id', bookingId).single();
  if (fetchError || !booking) {
    return { success: false, message: 'Database Error: Could not find the booking.' };
  }

  const newBill: Bill = {
    id: randomUUID(),
    description,
    amount,
    createdAt: new Date().toISOString(),
    actorName: session.name, // Record who added the bill.
  };

  const updatedBills = [...(booking.data.bills || []), newBill];
  const updatedData = { ...booking.data, bills: updatedBills };

  const { error } = await supabase.from('bookings').update({ data: updatedData }).eq('id', bookingId);
  if (error) {
    return { success: false, message: `Database Error: Failed to add bill. ${error.message}` };
  }

  revalidatePath(`/booking/${bookingId}`);
  return { success: true, message: 'Bill added successfully.' };
}

// Zod schema for recording a payment.
const AddPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  method: z.enum(['Cash', 'Transfer', 'Debit', 'Credit']),
  notes: z.string().optional(),
});

/**
 * Records a new payment made for a booking.
 * @param data - The payment details.
 * @returns A result object indicating success or failure.
 */
export async function addPaymentAction(data: z.infer<typeof AddPaymentSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    
    if (!session || !hasPermission(perms, session, 'booking:update')) {
        return { success: false, message: 'Permission Denied: You are not authorized to record payments.' };
    }
    
    const validatedFields = AddPaymentSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Validation Error: Please check the form for invalid data." };
    }
    
    const { bookingId, amount, method, notes } = validatedFields.data;
    
    const { data: booking, error: fetchError } = await supabase.from('bookings').select('data').eq('id', bookingId).single();
    if (fetchError || !booking) {
        return { success: false, message: 'Database Error: Could not find the booking.' };
    }
    
    const newPayment: Payment = {
        id: randomUUID(),
        amount,
        method,
        notes,
        timestamp: new Date().toISOString(),
        actorName: session.name, // Record who recorded the payment.
    };
    
    const updatedPayments = [...(booking.data.payments || []), newPayment];
    const updatedData = { ...booking.data, payments: updatedPayments };
    
    const { error } = await supabase.from('bookings').update({ data: updatedData }).eq('id', bookingId);
    if (error) {
        return { success: false, message: `Database Error: Failed to record payment. ${error.message}` };
    }
    
    revalidatePath(`/booking/${bookingId}`);
    return { success: true, message: 'Payment recorded successfully.' };
}

const AvailableInventorySchema = z.object({
    listingId: z.string(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
    excludeBookingId: z.string().optional(),
});

/**
 * Fetches available inventory units for a given date range, excluding a specific booking.
 * This is used in the booking edit form to show which units can be assigned.
 * @param data - The criteria for checking availability.
 * @returns An object with an array of available inventory IDs, or an error message.
 */
export async function getAvailableInventoryForBookingAction(data: z.infer<typeof AvailableInventorySchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(perms, session, 'booking:update')) {
        return { success: false, message: 'Permission Denied' };
    }

    const { listingId, startDate, endDate, excludeBookingId } = data;
    try {
        const inventoryIds = await findAvailableInventory(supabase, listingId, startDate, endDate, excludeBookingId);
        return { success: true, inventoryIds };
    } catch(e: any) {
        return { success: false, message: e.message };
    }
}


const SetDiscountSchema = z.object({
    bookingId: z.string(),
    discountPercentage: z.coerce.number().min(0, "Discount cannot be negative.").max(15, "Discount cannot exceed 15%."),
});

/**
 * Sets a discount percentage on a booking.
 * @param data - The booking ID and discount percentage.
 * @returns A result object indicating success or failure.
 */
export async function setDiscountAction(data: z.infer<typeof SetDiscountSchema>) {
    const perms = await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();

    if (!session || !hasPermission(perms, session, 'booking:update')) {
        return { success: false, message: 'Permission Denied: You are not authorized to set a discount.' };
    }

    const validatedFields = SetDiscountSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Validation Error: Please check the form for invalid data." };
    }

    const { bookingId, discountPercentage } = validatedFields.data;

    const { data: booking, error: fetchError } = await supabase.from('bookings').select('data').eq('id', bookingId).single();
    if (fetchError || !booking) {
        return { success: false, message: 'Database Error: Could not find the booking.' };
    }

    const updatedData = { ...booking.data, discount: discountPercentage };

    const { error } = await supabase.from('bookings').update({ data: updatedData }).eq('id', bookingId);
    if (error) {
        return { success: false, message: `Database Error: Failed to set discount. ${error.message}` };
    }

    revalidatePath(`/booking/${bookingId}`);
    return { success: true, message: 'Discount applied successfully.' };
}
