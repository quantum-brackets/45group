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
import { getSession } from './session'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from './supabase'
import { hashPassword } from './password'
import { logout as sessionLogout } from './session'
import { hasPermission, preloadPermissions } from './permissions'
import type { Booking, Listing, ListingInventory, Permission, Role, Review, User, BookingAction, Bill, Payment } from './types'
import { randomUUID } from 'crypto'


/**
 * Updates the permissions for all roles in the system.
 * This is an admin-only action.
 * @param permissions - An object where keys are roles and values are arrays of permission strings.
 * @returns A result object indicating success or failure.
 */
export async function updatePermissionsAction(permissions: Record<Role, Permission[]>) {
    await preloadPermissions();
    const session = await getSession();
    // Security: Ensure the user has permission to update permissions.
    if (!session || !hasPermission(session, 'permissions:update')) {
      return { success: false, message: 'Unauthorized' };
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
      return { success: false, message: `Failed to save permissions: ${error.message}` };
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
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    // Security: Check permissions.
    if (!session || !hasPermission(session, 'listing:create')) {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
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
        return { success: false, message: `Failed to create listing: ${listingError?.message}` };
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
            return { success: false, message: `Failed to create inventory: ${inventoryError.message}` };
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'listing:update')) {
    return { success: false, message: 'Unauthorized' };
  }
  
  const validatedFields = ListingFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data provided.",
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
      return { success: false, message: 'Listing not found.' };
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
    return { success: false, message: `Failed to update listing: ${updateError.message}` };
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
      if (bookedError) return { success: false, message: `Failed to check bookings: ${bookedError.message}` };

      const bookedIds = new Set(bookedInv.flatMap(b => b.data.inventoryIds || []));
      const isBookedItemDeleted = idsToDelete.some(id => bookedIds.has(id));

      if (isBookedItemDeleted) {
          return { success: false, message: 'Cannot delete inventory units that are part of an active or pending booking.' };
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
      return { success: false, message: `Failed to update inventory: ${firstError.error.message}` };
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'listing:delete')) {
    return { success: false, message: 'Unauthorized' };
  }
  
  // Safety check: Prevent deletion if there are active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .in('status', ['Pending', 'Confirmed'])
    .limit(1);

  if (bookingCheckError) {
    return { success: false, message: `Database error: ${bookingCheckError.message}` };
  }
  if (activeBookings && activeBookings.length > 0) {
    return { success: false, message: 'Cannot delete listing with active or pending bookings. Please cancel them first.' };
  }

  // The database is set up with cascading deletes, so deleting the listing
  // will also delete its inventory units.
  const { error } = await supabase.from('listings').delete().eq('id', id);

  if (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to delete listing: ${error.message}` };
  }

  revalidatePath('/dashboard?tab=listings', 'page');
  return { success: true, message: 'Listing and all its inventory have been deleted.' };
}

// Zod schema for validating booking creation data.
// Includes a `superRefine` for conditional validation based on whether it's a guest checkout.
const CreateBookingSchema = z.object({
  listingId: z.string(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
  userId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
}).superRefine((data, ctx) => {
    // If a user is logged in (or an admin is booking for a user), guest fields are not needed.
    if (data.userId) {
        return;
    }

    // This is a guest checkout, so guest name and email are required.
    if (!data.guestName || data.guestName.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Guest name is required.",
            path: ['guestName']
        });
    }

    if (!data.guestEmail || data.guestEmail.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Guest email is required.",
            path: ['guestEmail']
        });
    } else {
        const emailCheck = z.string().email().safeParse(data.guestEmail);
        if (!emailCheck.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.invalid_string,
                validation: 'email',
                message: 'Invalid email address provided for guest.',
                path: ['guestEmail']
            });
        }
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

    if (invError) throw new Error('Could not fetch inventory.');

    const allInventoryIds = allInventory.map((inv: any) => inv.id);

    // Find all confirmed bookings that overlap with the requested date range.
    let bookingsQuery = supabase
        .from('bookings')
        .select('data')
        .eq('listing_id', listingId)
        .eq('status', 'Confirmed')
        .lte('start_date', endDate) // A booking that starts before or on the day the new one ends.
        .gte('end_date', startDate); // A booking that ends after or on the day the new one starts.
    
    // If we are updating a booking, we need to exclude it from the check.
    if (excludeBookingId) {
        bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }
        
    const { data: overlappingBookings, error: bookingsError } = await bookingsQuery;
    
    if (bookingsError) throw new Error('Could not check for overlapping bookings.');
    
    // Get a set of all inventory IDs that are booked during the overlapping period.
    const bookedInventoryIds = new Set(overlappingBookings.flatMap((b: any) => b.data.inventoryIds || []));
    
    // Return the list of inventory IDs that are not booked.
    return allInventoryIds.filter((id: string) => !bookedInventoryIds.has(id));
}

/**
 * Creates a new booking. Handles logged-in users, admins booking for guests, and new guest checkouts.
 * @param data - The booking data.
 * @returns A result object indicating success or failure.
 */
export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).map(e => e?.[0]).filter(Boolean).join(', ');
      return { success: false, message: `Invalid data provided: ${errorMessages || 'Please check your input.'}` };
  }

  const { listingId, startDate, endDate, guests, numberOfUnits, userId, guestName, guestEmail } = validatedFields.data;
  
  let finalUserId: string;
  let finalBookingName: string;
  let actorId: string;
  let actorName: string;

  if (session) {
    // --- Logged-in user flow ---
    finalUserId = userId || session.id; // `userId` is from the form if an admin booked for another user.
    actorId = session.id;
    actorName = session.name;

    // Get the name of the user the booking is actually for.
    const { data: targetUser, error: targetUserError } = await supabase.from('users').select('data').eq('id', finalUserId).single();
    if (targetUserError || !targetUser) {
        return { success: false, message: 'Target user for the booking was not found.' };
    }
    finalBookingName = targetUser.data.name;

    // Permission checks
    const isBookingForOther = session.id !== finalUserId;
    if (isBookingForOther) {
      if (!hasPermission(session, 'booking:create')) {
        return { success: false, message: 'You do not have permission to create bookings for other users.' };
      }
    } else {
      if (!hasPermission(session, 'booking:create:own', { ownerId: session.id })) {
        return { success: false, message: 'You do not have permission to create bookings.' };
      }
    }
  } else {
    // --- Guest checkout flow ---
    if (!guestName || !guestEmail) {
        return { success: false, message: "Guest name and email are required." };
    }

    const { data: existingUser } = await supabase.from('users').select('id, status').eq('email', guestEmail).single();

    if (existingUser) {
        // If an account exists, handle it based on status.
        if (existingUser.status === 'active') {
            return { success: false, message: 'An account with this email already exists. Please log in to continue.' };
        }
        finalUserId = existingUser.id; // Use existing provisional user ID.
    } else {
        // If no account exists, create a new 'provisional' user.
        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            email: guestEmail,
            role: 'guest',
            status: 'provisional',
            data: { name: guestName }
        }).select('id').single();

        if (insertError || !newUser) {
            console.error('[GUEST_BOOKING] Error creating provisional user:', insertError);
            return { success: false, message: 'Could not create a provisional account.' };
        }
        finalUserId = newUser.id;
    }
    finalBookingName = guestName;
    actorId = finalUserId; // For guests, the actor is themselves.
    actorName = guestName;
  }
  
  try {
      // Check for available inventory before creating the booking.
      const availableInventory = await findAvailableInventory(supabase, listingId, startDate, endDate);
      if (availableInventory.length < numberOfUnits) {
          return { success: false, message: `Not enough units available for the selected dates. Only ${availableInventory.length} left.` };
      }
      const inventoryToBook = availableInventory.slice(0, numberOfUnits);
      
      const createdAt = new Date().toISOString();
      const isBookingForOther = session && session.id !== finalUserId;
      
      // Create a descriptive message for the initial booking action log.
      const message = isBookingForOther
        ? `Booking created by staff member ${actorName} on behalf of ${finalBookingName}.`
        : 'Booking request received.';

      // The first entry in the booking's audit trail.
      const initialAction: BookingAction = {
        timestamp: createdAt,
        actorId: actorId,
        actorName: actorName,
        action: 'Created',
        message: message
      };

      const bookingData = {
          guests,
          bookingName: finalBookingName,
          inventoryIds: inventoryToBook,
          actions: [initialAction],
          createdAt: createdAt,
          bills: [], // Initialize bills
          payments: [], // Initialize payments
      };

      const { error: createBookingError } = await supabase.from('bookings').insert({
          listing_id: listingId,
          user_id: finalUserId,
          start_date: startDate,
          end_date: endDate,
          status: 'Pending', // All new bookings start as Pending.
          data: bookingData
      });

      if (createBookingError) throw createBookingError;

      revalidatePath('/bookings');
      revalidatePath(`/listing/${listingId}`);
      if (session) {
        return { success: true, message: 'Your booking request has been sent and is pending confirmation.' };
      } else {
        return { success: true, message: 'Your booking request has been sent! Check your email to complete your account setup.' };
      }

  } catch (e: any) {
      return { success: false, message: e.message };
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
});

/**
 * Updates an existing booking.
 * @param data - The updated booking data.
 * @returns A result object indicating success or failure.
 */
export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) return { success: false, message: 'Unauthorized' };
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Invalid data provided." };

    const { bookingId, startDate, endDate, guests, numberOfUnits, bookingName, userId } = validatedFields.data;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('user_id, listing_id, data, status, start_date, end_date')
      .eq('id', bookingId)
      .single();
      
    if (fetchError || !booking) return { success: false, message: 'Booking not found.' };

    // Security: Check if user has permission to update this specific booking.
    if (!hasPermission(session, 'booking:update:own', { ownerId: booking.user_id }) && !hasPermission(session, 'booking:update')) {
      return { success: false, message: 'You do not have permission to update this booking.' };
    }

    const ownerChanged = userId && userId !== booking.user_id;

    if (ownerChanged && !hasPermission(session, 'booking:update')) {
        return { success: false, message: 'You do not have permission to change the booking owner.' };
    }

    // Determine if critical fields have changed, which may require re-confirmation.
    const existingStartDate = new Date(booking.start_date).toISOString();
    const existingEndDate = new Date(booking.end_date).toISOString();
    const existingNumberOfUnits = (booking.data.inventoryIds || []).length;

    const datesChanged = startDate !== existingStartDate || endDate !== existingEndDate;
    const unitsChanged = numberOfUnits !== existingNumberOfUnits;

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
        const { data: newUser } = await supabase.from('users').select('name:data->>name').eq('id', userId!).single();
        if (!newUser || !newUser.name) {
            return { success: false, message: 'The selected new owner does not exist or has no name.' };
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
        // Re-check inventory availability for the new dates, excluding the current booking.
        const availableInventory = await findAvailableInventory(supabase, booking.listing_id, startDate, endDate, bookingId);
        if (availableInventory.length < numberOfUnits) {
            return { success: false, message: `Not enough units available for the new dates. Only ${availableInventory.length} left.` };
        }
        const inventoryToBook = availableInventory.slice(0, numberOfUnits);
        
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
        return { success: false, message: e.message };
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('user_id, listing_id, data').eq('id', bookingId).single();
  if (fetchError || !booking) return { error: 'Booking not found.' };

  // Security: Check permissions.
  if (!hasPermission(session, 'booking:cancel:own', { ownerId: booking.user_id }) && !hasPermission(session, 'booking:cancel')) {
    return { error: 'You do not have permission to cancel this booking.' };
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
  
  if (error) return { error: `Failed to cancel booking: ${error.message}` };

  revalidatePath('/bookings');
  revalidatePath(`/booking/${bookingId}`);
  
  return { success: `Booking for ${listing?.data.name || 'listing'} has been cancelled.` };
}

/**
 * Confirms a pending booking.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'booking:confirm')) {
      return { error: 'Unauthorized: Only administrators can confirm bookings.' };
    }
  
    const { bookingId } = BookingActionSchema.parse(data);
  
    const { data: booking, error: fetchError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if(fetchError || !booking) return { error: 'Booking not found.' };

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
            return { error: 'Inventory conflict detected. The booking has been cancelled.' };
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
        
        revalidatePath('/bookings');
        revalidatePath(`/booking/${bookingId}`);
        return { success: `Booking has been confirmed.` };
    } catch (e: any) {
        return { error: e.message };
    }
}

// Zod schema for adding/updating users.
const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:create')) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UserFormSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: "Invalid data provided." };

  const { name, email, password, role: initialRole, status, notes, phone } = validatedFields.data;
  
  let role = initialRole;

  // Security: Staff can only create guest accounts.
  if (session.role === 'staff') {
    role = 'guest';
  }
  
  if (!password) return { success: false, message: "Password is required for new users." };
  
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
  if (existingUser) return { success: false, message: 'A user with this email already exists.' };

  const hashedPassword = await hashPassword(password);
  const userJsonData = { name, password: hashedPassword, notes, phone };

  const { error } = await supabase.from('users').insert({ email, role, status, data: userJsonData });

  if (error) return { success: false, message: `Failed to create user: ${error.message}` };

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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:update')) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UserFormSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: "Invalid data provided." };
  
  const { data: existingUser, error: fetchError } = await supabase.from('users').select('data, email, role, status').eq('id', id).single();
  if(fetchError || !existingUser) return { success: false, message: 'User not found.' };

  const { name, email, password, role, status, notes, phone } = validatedFields.data;

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

  if (error) return { success: false, message: `Failed to update user: ${error.message}` };

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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:delete')) {
    return { success: false, message: 'Unauthorized' };
  }

  // Safety check: Prevent users from deleting themselves.
  if (userId === session.id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  // Safety check: Prevent deleting users with active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['Pending', 'Confirmed'])
    .limit(1);

  if (bookingCheckError) {
    return { success: false, message: `Database error when checking bookings: ${bookingCheckError.message}` };
  }
  
  if (activeBookings && activeBookings.length > 0) {
    return { success: false, message: 'This user has active or pending bookings and cannot be deleted.' };
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    console.error(`[DELETE_USER_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to delete user: ${error.message}` };
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session) return { success: false, message: 'Unauthorized' };
  
  if (!hasPermission(session, 'user:update:own', { ownerId: session.id })) {
    return { success: false, message: 'You do not have permission to update your profile.'}
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: "Invalid data provided." };

  const { data: existingUser, error: fetchError } = await supabase.from('users').select('data').eq('id', session.id).single();
  if (fetchError || !existingUser) return { success: false, message: 'Could not find your user profile.' };
  
  const { name, email, password, notes, phone } = validatedFields.data;
  let userJsonData = { ...existingUser.data, name, notes, phone };

  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update({ email, data: userJsonData }).eq('id', session.id);
  if (error) return { success: false, message: `Failed to update profile: ${error.message}` };
  
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
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) return { success: false, message: 'You must be logged in to submit a review.' };
    
    if (!hasPermission(session, 'review:create:own', { ownerId: session.id })) {
      return { success: false, message: 'Unauthorized action.'};
    }

    const validatedFields = ReviewSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Invalid data provided." };

    const { listingId, rating, comment } = validatedFields.data;
    
    // Fetch the listing to update its `reviews` array in the JSONB data.
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: `Could not find the listing.` };

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
    if (updateError) return { success: false, message: `Failed to submit review: ${updateError.message}` };

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
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'review:approve')) return { success: false, message: 'Unauthorized action.' };

    const { listingId, reviewId } = data;
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: 'Listing not found.' };

    const reviews = (listing.data.reviews || []) as Review[];
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);
    if (reviewIndex === -1) return { success: false, message: 'Review not found.' };

    reviews[reviewIndex].status = 'approved';

    // Recalculate the listing's average rating based on all approved reviews.
    // TODO: This is another candidate for a database trigger to ensure it's always in sync.
    const approvedReviews = reviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;
    
    const updatedData = { ...listing.data, reviews: reviews, rating: newAverageRating };

    const { error: updateError } = await supabase.from('listings').update({ data: updatedData }).eq('id', listingId);
    if (updateError) return { success: false, message: `Failed to approve review: ${updateError.message}` };

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review approved successfully.' };
}

/**
 * Deletes a review.
 * @param data - The listing and review IDs.
 * @returns A result object indicating success or failure.
 */
export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'review:delete')) return { success: false, message: 'Unauthorized action.' };
    
    const { listingId, reviewId } = data;
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: 'Listing not found.' };
    
    const reviews = (listing.data.reviews || []) as Review[];
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    
    // Recalculate average rating after deletion.
    const approvedReviews = updatedReviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;

    const updatedData = { ...listing.data, reviews: updatedReviews, rating: newAverageRating };

    const { error: updateError } = await supabase.from('listings').update({ data: updatedData }).eq('id', listingId);
    if (updateError) return { success: false, message: `Failed to delete review: ${updateError.message}` };

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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:update')) {
    return { success: false, message: 'Unauthorized' };
  }

  const { userId, status } = ToggleUserStatusSchema.parse(data);
  // Safety check: Prevent users from disabling themselves.
  if (userId === session.id) return { success: false, message: "You cannot change your own status." };
  
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) return { success: false, message: `Database error: ${error.message}` };

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
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'listing:delete')) {
        return { success: false, message: 'Unauthorized' };
    }

    const { listingIds } = BulkDeleteListingsSchema.parse(data);

    // Safety check: Ensure none of the selected listings have active bookings.
    const { data: activeBookings, error: bookingCheckError } = await supabase
      .from('bookings')
      .select('listing_id')
      .in('listing_id', listingIds)
      .in('status', ['Pending', 'Confirmed'])
      .limit(1);

    if(bookingCheckError) return { success: false, message: `DB Error: ${bookingCheckError.message}` };
    if(activeBookings && activeBookings.length > 0) return { success: false, message: `One or more selected listings have active bookings. Please cancel them first.` };

    const { error } = await supabase.from('listings').delete().in('id', listingIds);
    if (error) return { success: false, message: `Failed to delete listings: ${error.message}` };
    
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
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  // Only users with booking update permissions (admin/staff) can add bills.
  if (!session || !hasPermission(session, 'booking:update')) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = AddBillSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided." };
  }

  const { bookingId, description, amount } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('data').eq('id', bookingId).single();
  if (fetchError || !booking) {
    return { success: false, message: 'Booking not found.' };
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
    return { success: false, message: `Failed to add bill: ${error.message}` };
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
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'booking:update')) {
        return { success: false, message: 'Unauthorized' };
    }
    
    const validatedFields = AddPaymentSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided." };
    }
    
    const { bookingId, amount, method, notes } = validatedFields.data;
    
    const { data: booking, error: fetchError } = await supabase.from('bookings').select('data').eq('id', bookingId).single();
    if (fetchError || !booking) {
        return { success: false, message: 'Booking not found.' };
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
        return { success: false, message: `Failed to add payment: ${error.message}` };
    }
    
    revalidatePath(`/booking/${bookingId}`);
    return { success: true, message: 'Payment recorded successfully.' };
}
