







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


export async function updatePermissionsAction(permissions: Record<Role, Permission[]>) {
    await preloadPermissions();
    const session = await getSession();
    if (!session || !hasPermission(session, 'permissions:update')) {
      return { success: false, message: 'Unauthorized' };
    }
  
    const supabase = createSupabaseAdminClient();
    
    const updates = Object.entries(permissions).map(([role, perms]) => ({
      role: role,
      data: { permissions: perms }
    }));

    const { error } = await supabase.from('role_permissions').upsert(updates, { onConflict: 'role' });
  
    if (error) {
      console.error('Error saving permissions:', error);
      return { success: false, message: `Failed to save permissions: ${error.message}` };
    }
  
    revalidatePath('/dashboard/permissions');
    return { success: true, message: 'Permissions updated successfully.' };
  }


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
  inventory: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Unit name cannot be empty."),
    })
  ).min(0, "There must be at least 0 units."),
});


export async function createListingAction(data: z.infer<typeof ListingFormSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'listing:create')) {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory } = validatedFields.data;
    
    const listingJsonData = {
        name, description, price, price_unit, currency, max_guests, 
        features: features.split(',').map(f => f.trim()),
        images,
        rating: 0,
        reviews: [],
    };

    const { data: newListing, error: listingError } = await supabase.from('listings').insert({
        type,
        location,
        data: listingJsonData
    }).select('id').single();

    if (listingError || !newListing) {
        console.error('[CREATE_LISTING_ACTION] Error creating listing:', listingError);
        return { success: false, message: `Failed to create listing: ${listingError?.message}` };
    }

    if (inventory.length > 0) {
        const inventoryItems = inventory.map(item => ({
            listing_id: newListing.id,
            name: item.name,
        }));
        const { error: inventoryError } = await supabase.from('listing_inventory').insert(inventoryItems);
        if (inventoryError) {
            console.error('[CREATE_LISTING_ACTION] Error creating inventory:', inventoryError);
            // Optionally delete the created listing for consistency
            await supabase.from('listings').delete().eq('id', newListing.id);
            return { success: false, message: `Failed to create inventory: ${inventoryError.message}` };
        }
    }
        
    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: `Listing "${name}" has been created with ${inventory.length} units.` };
}

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

  // Fetch existing listing to preserve reviews and rating
  const { data: existingListing, error: fetchError } = await supabase
    .from('listings')
    .select('data')
    .eq('id', id)
    .single();

  if (fetchError || !existingListing) {
      return { success: false, message: 'Listing not found.' };
  }
  
  const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory: formInventory } = validatedFields.data;

  const listingJsonData = {
      ...existingListing.data, // Preserve existing data like reviews, rating
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

  // Smart inventory reconciliation
  const { data: dbInventory } = await supabase.from('listing_inventory').select('id, name').eq('listing_id', id);
  const dbInventoryMap = new Map((dbInventory || []).map(i => [i.id, i.name]));
  const formInventoryMap = new Map(formInventory.filter(i => i.id).map(i => [i.id!, i.name]));

  const itemsToCreate = formInventory.filter(i => !i.id);
  const itemsToUpdate = formInventory.filter(i => i.id && dbInventoryMap.has(i.id) && dbInventoryMap.get(i.id) !== i.name);
  const idsToDelete = (dbInventory || []).filter(i => !formInventoryMap.has(i.id)).map(i => i.id);

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

  revalidatePath('/dashboard?tab=listings', 'page');
  revalidatePath(`/listing/${id}`);
  revalidatePath('/bookings');
  
  return { success: true, message: `The details for "${name}" have been saved.` };
}

export async function deleteListingAction(id: string) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'listing:delete')) {
    return { success: false, message: 'Unauthorized' };
  }
  
  // Check for active bookings before deleting
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

  // Deleting the listing will cascade to inventory due to foreign key constraints
  const { error } = await supabase.from('listings').delete().eq('id', id);

  if (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to delete listing: ${error.message}` };
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
  guestEmail: z.string().email("Please enter a valid email address.").optional(),
  bookingName: z.string().optional(),
});

async function findAvailableInventory(supabase: any, listingId: string, startDate: string, endDate: string, excludeBookingId?: string): Promise<string[]> {
    const { data: allInventory, error: invError } = await supabase
        .from('listing_inventory')
        .select('id')
        .eq('listing_id', listingId);

    if (invError) throw new Error('Could not fetch inventory.');

    const allInventoryIds = allInventory.map((inv: any) => inv.id);

    let bookingsQuery = supabase
        .from('bookings')
        .select('data')
        .eq('listing_id', listingId)
        .eq('status', 'Confirmed')
        .lte('start_date', endDate)
        .gte('end_date', startDate);
    
    if (excludeBookingId) {
        bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }
        
    const { data: overlappingBookings, error: bookingsError } = await bookingsQuery;
    
    if (bookingsError) throw new Error('Could not check for overlapping bookings.');
    
    const bookedInventoryIds = new Set(overlappingBookings.flatMap((b: any) => b.data.inventoryIds || []));
    return allInventoryIds.filter((id: string) => !bookedInventoryIds.has(id));
}

export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  let session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
      const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors).map(e => e?.[0]).filter(Boolean).join(', ');
      return { success: false, message: `Invalid data provided: ${errorMessages || 'Please check your input.'}` };
  }

  const { listingId, startDate, endDate, guests, numberOfUnits, guestEmail, bookingName } = validatedFields.data;
  let userId = session?.id;
  let finalBookingName = bookingName || session?.name;
  let finalActorName = session?.name || 'Guest';

  if (!session && guestEmail) {
      const { data: existingUser, error: findError } = await supabase.from('users').select('id, data').eq('email', guestEmail).single();
      if (findError && findError.code !== 'PGRST116') {
          return { success: false, message: `Database error: ${findError.message}` };
      }
      if (existingUser) {
          userId = existingUser.id;
          finalBookingName = bookingName || existingUser.data.name;
          finalActorName = existingUser.data.name || 'Guest';
      } else {
          const newUserId = randomUUID();
          const { data: newUser, error: createError } = await supabase.from('users').insert({
              id: newUserId,
              email: guestEmail,
              status: 'provisional',
              role: 'guest',
              data: { name: bookingName }
          }).select('id').single();
          if (createError || !newUser) {
              return { success: false, message: `Could not create guest account: ${createError.message}` };
          }
          userId = newUser.id;
          finalBookingName = bookingName;
          finalActorName = bookingName || 'Guest';
      }
  } else if (!session && !guestEmail) {
      return { success: false, message: 'You must be logged in or provide an email to book.' };
  }

  if (!userId) {
      return { success: false, message: 'User could not be identified.' };
  }
  
  if (session) {
    if (!hasPermission(session, 'booking:create:own', { ownerId: userId }) && !hasPermission(session, 'booking:create')) {
      return { success: false, message: 'You do not have permission to create this booking.' };
    }
  }

  try {
      const availableInventory = await findAvailableInventory(supabase, listingId, startDate, endDate);
      if (availableInventory.length < numberOfUnits) {
          return { success: false, message: `Not enough units available for the selected dates. Only ${availableInventory.length} left.` };
      }
      const inventoryToBook = availableInventory.slice(0, numberOfUnits);
      
      const createdAt = new Date().toISOString();
      const initialAction: BookingAction = {
        timestamp: createdAt,
        actorId: userId,
        actorName: finalActorName,
        action: 'Created',
        message: 'Booking request received.'
      };

      const bookingData = {
          guests,
          bookingName: finalBookingName,
          inventoryIds: inventoryToBook,
          actions: [initialAction],
          createdAt: createdAt,
          bills: [],
          payments: [],
      };

      const { error: createBookingError } = await supabase.from('bookings').insert({
          listing_id: listingId,
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          status: 'Pending',
          data: bookingData
      });

      if (createBookingError) throw createBookingError;

      revalidatePath('/bookings');
      revalidatePath(`/listing/${listingId}`);
      return { success: true, message: 'Your booking request has been sent and is pending confirmation.' };

  } catch (e: any) {
      return { success: false, message: e.message };
  }
}

const UpdateBookingSchema = z.object({
  bookingId: z.string(),
  bookingName: z.string().min(1, "Booking name is required."),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
  userId: z.string().optional(),
});

export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) return { success: false, message: 'Unauthorized' };
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) return { success: false, message: "Invalid data provided." };

    const { bookingId, startDate, endDate, guests, numberOfUnits, bookingName, userId } = validatedFields.data;

    // Fetch the full booking record to check current state
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('user_id, listing_id, data, status, start_date, end_date')
      .eq('id', bookingId)
      .single();
      
    if (fetchError || !booking) return { success: false, message: 'Booking not found.' };

    if (!hasPermission(session, 'booking:update:own', { ownerId: booking.user_id }) && !hasPermission(session, 'booking:update')) {
      return { success: false, message: 'You do not have permission to update this booking.' };
    }

    const ownerChanged = userId && userId !== booking.user_id;

    if (ownerChanged && !hasPermission(session, 'booking:update')) {
        return { success: false, message: 'You do not have permission to change the booking owner.' };
    }

    // Determine if critical fields have changed
    const existingStartDate = new Date(booking.start_date).toISOString();
    const existingEndDate = new Date(booking.end_date).toISOString();
    const existingNumberOfUnits = (booking.data.inventoryIds || []).length;

    const datesChanged = startDate !== existingStartDate || endDate !== existingEndDate;
    const unitsChanged = numberOfUnits !== existingNumberOfUnits;

    let newStatus = booking.status;
    let successMessage: string;
    const actions: BookingAction[] = [...(booking.data.actions || [])];


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

export async function logoutAction() {
    await sessionLogout();
    redirect('/login');
}

const BookingActionSchema = z.object({
  bookingId: z.string(),
});

export async function cancelBookingAction(data: z.infer<typeof BookingActionSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('user_id, listing_id, data').eq('id', bookingId).single();
  if (fetchError || !booking) return { error: 'Booking not found.' };

  if (!hasPermission(session, 'booking:cancel:own', { ownerId: booking.user_id }) && !hasPermission(session, 'booking:cancel')) {
    return { error: 'You do not have permission to cancel this booking.' };
  }
  
  const { data: listing } = await supabase.from('listings').select('data').eq('id', booking.listing_id).single();
  
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
        const availableInventory = await findAvailableInventory(supabase, booking.listing_id, booking.start_date, booking.end_date, bookingId);
        
        const currentlyHeldIds = new Set(booking.data.inventoryIds || []);
        const stillAvailable = availableInventory.filter(id => currentlyHeldIds.has(id));

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

const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  role: z.enum(['admin', 'guest', 'staff']),
  status: z.enum(['active', 'disabled', 'provisional']),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

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

  if (session.role === 'staff') {
    // Enforce that staff can only create guest accounts, regardless of form input.
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
  
  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update({ email, role, status, data: userJsonData }).eq('id', id);

  if (error) return { success: false, message: `Failed to update user: ${error.message}` };

  revalidatePath('/dashboard?tab=users', 'page');
  revalidatePath(`/dashboard/edit-user/${id}`);
  
  return { success: true, message: `User "${name}" was updated successfully.`, changesMade: true };
}

export async function deleteUserAction(userId: string) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:delete')) {
    return { success: false, message: 'Unauthorized' };
  }

  if (userId === session.id) {
    return { success: false, message: "You cannot delete your own account." };
  }

  // Check for active bookings
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


const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

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
  revalidatePath('/', 'layout');
  
  return { success: true, message: `Your profile has been updated successfully.` };
}

const ReviewSchema = z.object({
    listingId: z.string(),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().min(10, "Comment must be at least 10 characters long.")
});

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
    
    const { data: listing, error: fetchError } = await supabase.from('listings').select('data').eq('id', listingId).single();
    if (fetchError || !listing) return { success: false, message: `Could not find the listing.` };

    const reviews = (listing.data.reviews || []) as Review[];
    const existingReviewIndex = reviews.findIndex(r => r.user_id === session.id);

    const newReviewData: Review = {
        id: existingReviewIndex > -1 ? reviews[existingReviewIndex].id : randomUUID(),
        user_id: session.id,
        author: session.name,
        avatar: `https://avatar.vercel.sh/${session.email}.png`,
        rating: rating,
        comment: comment,
        status: 'pending',
    };

    if (existingReviewIndex > -1) {
        reviews[existingReviewIndex] = newReviewData;
    } else {
        reviews.push(newReviewData);
    }
    
    const { error: updateError } = await supabase.from('listings').update({ data: { ...listing.data, reviews: reviews } }).eq('id', listingId);
    if (updateError) return { success: false, message: `Failed to submit review: ${updateError.message}` };

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Your review has been submitted and is awaiting approval.' };
}


const ReviewActionSchema = z.object({
  listingId: z.string(),
  reviewId: z.string(),
});

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

const ToggleUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['active', 'disabled']),
});

export async function toggleUserStatusAction(data: z.infer<typeof ToggleUserStatusSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(session, 'user:update')) {
    return { success: false, message: 'Unauthorized' };
  }

  const { userId, status } = ToggleUserStatusSchema.parse(data);
  if (userId === session.id) return { success: false, message: "You cannot change your own status." };
  
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);
  if (error) return { success: false, message: `Database error: ${error.message}` };

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: `User status has been updated to ${status}.` };
}

const BulkDeleteListingsSchema = z.object({
  listingIds: z.array(z.string()).min(1, "At least one listing must be selected for deletion."),
});

export async function bulkDeleteListingsAction(data: z.infer<typeof BulkDeleteListingsSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'listing:delete')) {
        return { success: false, message: 'Unauthorized' };
    }

    const { listingIds } = BulkDeleteListingsSchema.parse(data);

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


const AddBillSchema = z.object({
  bookingId: z.string(),
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

export async function addBillAction(data: z.infer<typeof AddBillSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
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
    actorName: session.name,
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


const AddPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  method: z.enum(['Cash', 'Transfer', 'Debit', 'Credit']),
  notes: z.string().optional(),
});

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
        actorName: session.name,
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
