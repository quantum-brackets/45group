
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from './session'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from './supabase'
import { hashPassword } from './password'
import { logout as sessionLogout } from './session'
import { hasPermission, preloadPermissions } from './permissions'
import type { Booking, Listing, ListingInventory, Permission, Role, Review, User } from './types'
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
      permissions: perms
    }));

    const { error } = await supabase.from('role_permissions').upsert(updates);
  
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
  inventory_count: z.coerce.number().int().min(0, "Inventory count must be 0 or more."),
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

    const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory_count } = validatedFields.data;
    
    const { error } = await supabase.rpc('create_listing_with_inventory', {
        p_name: name,
        p_type: type,
        p_location: location,
        p_description: description,
        p_images: images,
        p_price: price,
        p_price_unit: price_unit,
        p_currency: currency,
        p_max_guests: max_guests,
        p_features: features.split(',').map(f => f.trim()),
        p_inventory_count: inventory_count
    });

    if (error) {
        console.error('[CREATE_LISTING_ACTION] Error:', error);
        return { success: false, message: `Failed to create listing: ${error.message}` };
    }
        
    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: `Listing "${name}" has been created with ${inventory_count} units.` };
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
  
  const { name, type, location, description, price, price_unit, currency, max_guests, features, images, inventory_count } = validatedFields.data;

  const { error } = await supabase.rpc('update_listing_with_inventory', {
    p_listing_id: id,
    p_name: name,
    p_type: type,
    p_location: location,
    p_description: description,
    p_price: price,
    p_price_unit: price_unit,
    p_currency: currency,
    p_max_guests: max_guests,
    p_features: features.split(',').map(f => f.trim()),
    p_images: images,
    p_new_inventory_count: inventory_count
  });

  if (error) {
    console.error(`[UPDATE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to update listing: ${error.message}` };
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

  const { error } = await supabase.rpc('delete_listing_with_bookings_check', {
    p_listing_id: id
  });

  if (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: `${error.message}` };
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
});

export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  const canCreateForOwn = hasPermission(session, 'booking:create:own');
  const canCreateForAny = hasPermission(session, 'booking:create');
  
  if (!session && !data.guestEmail) {
    return { success: false, message: "You must be logged in to book."}
  }

  if (session && !canCreateForOwn && !canCreateForAny) {
    return { success: false, message: 'You do not have permission to create bookings.' };
  }

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
    const errorMessages = Object.values(validatedFields.error.flatten().fieldErrors)
        .map((errors) => errors?.[0])
        .filter(Boolean)
        .join(', ');

    return {
      success: false,
      message: `Invalid data provided: ${errorMessages || 'Please check your input.'}`,
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { listingId, startDate, endDate, guests, numberOfUnits, guestEmail } = validatedFields.data;
  
  const { data: message, error } = await supabase.rpc('create_booking_with_inventory_check', {
    p_listing_id: listingId,
    p_user_id: session?.id || null,
    p_start_date: new Date(startDate).toISOString(),
    p_end_date: new Date(endDate).toISOString(),
    p_guests: guests,
    p_num_units: numberOfUnits,
    p_guest_email: guestEmail,
    p_creator_id: session?.id || null
  });

  if (error) {
    console.error(`[CREATE_BOOKING_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to create booking: ${error.message}` };
  }
  
  revalidatePath('/bookings');
  revalidatePath(`/listing/${listingId}`);
  
  return { success: true, message: message as string };
}

const UpdateBookingSchema = z.object({
  bookingId: z.string(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
});

export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { bookingId, startDate, endDate, guests, numberOfUnits } = validatedFields.data;

    const { data: booking } = await supabase.from('bookings').select('user_id').eq('id', bookingId).single();

    const canUpdateOwn = hasPermission(session, 'booking:update:own', { ownerId: booking?.user_id });
    const canUpdateAny = hasPermission(session, 'booking:update');

    if (!canUpdateOwn && !canUpdateAny) {
      return { success: false, message: 'You do not have permission to update this booking.' };
    }

    const { error } = await supabase.rpc('update_booking_with_inventory_check', {
        p_booking_id: bookingId,
        p_new_start_date: new Date(startDate).toISOString(),
        p_new_end_date: new Date(endDate).toISOString(),
        p_new_guests: guests,
        p_new_num_units: numberOfUnits,
        p_editor_id: session.id,
        p_editor_name: session.name
    });

    if (error) {
        console.error(`[UPDATE_BOOKING_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to update booking: ${error.message}` };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);

    return { success: true, message: 'Booking has been updated and is now pending re-confirmation.' };
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
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = BookingActionSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid booking ID.' };
  }
  
  const { bookingId } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('user_id, listing_name:listings(name)').eq('id', bookingId).single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }

  const canCancelOwn = hasPermission(session, 'booking:cancel:own', { ownerId: booking.user_id });
  const canCancelAny = hasPermission(session, 'booking:cancel');
  
  if (!canCancelOwn && !canCancelAny) {
    return { error: 'You do not have permission to cancel this booking.' };
  }

  const { error } = await supabase.from('bookings').update({
    status: 'Cancelled',
    action_by_user_id: session.id,
    action_at: new Date().toISOString(),
    status_message: `Cancelled by ${session.name} on ${new Date().toLocaleDateString()}`
  }).eq('id', bookingId);
  
  if (error) {
    return { error: `Failed to cancel booking in the database: ${error.message}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/booking/${bookingId}`);
  
  return { success: `Booking for ${(booking.listing_name as any)?.name} has been cancelled.` };
}

export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'booking:confirm')) {
      return { error: 'Unauthorized: Only administrators can confirm bookings.' };
    }
  
    const validatedFields = BookingActionSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid booking ID.' };
    }
    
    const { bookingId } = validatedFields.data;
  
    const { error } = await supabase.rpc('confirm_booking_with_inventory_check', {
        p_booking_id: bookingId,
        p_admin_id: session.id,
        p_admin_name: session.name
    });

    if (error) {
        console.error(`[CONFIRM_BOOKING_ACTION] Error: ${error}`);
        return { error: error.message };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);
    
    return { success: `Booking has been confirmed.` };
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
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, role, status, notes, phone } = validatedFields.data;

  if (!password) {
    return { success: false, message: "Password is required for new users." };
  }
  
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
  if (existingUser) {
    return { success: false, message: 'A user with this email already exists.' };
  }

  const hashedPassword = await hashPassword(password);

  const { error } = await supabase.from('users').insert({
    name,
    email,
    password: hashedPassword,
    role,
    status,
    notes,
    phone
  });

  if (error) {
    return { success: false, message: `Failed to create user: ${error.message}` };
  }

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
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, role, status, notes, phone } = validatedFields.data;
  
  let updateData: any = { name, email, role, status, notes, phone };
  
  if (password) {
    updateData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update(updateData).eq('id', id);

  if (error) {
    return { success: false, message: `Failed to update user profile: ${error.message}` };
  }

  revalidatePath('/dashboard?tab=users', 'page');
  revalidatePath(`/dashboard/edit-user/${id}`);
  
  return { success: true, message: `User "${name}" was updated successfully.` };
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
  if (!session) {
    return { success: false, message: 'Unauthorized' };
  }
  
  const canUpdateOwn = hasPermission(session, 'user:update:own', { ownerId: session.id });
  if (!canUpdateOwn) {
    return { success: false, message: 'You do not have permission to update your profile.'}
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, notes, phone } = validatedFields.data;
  
  let updateData: any = { name, email, notes, phone };

  if (password) {
    updateData.password = await hashPassword(password);
  }

  const { error } = await supabase.from('users').update(updateData).eq('id', session.id);

  if (error) {
    return { success: false, message: `Failed to update profile: ${error.message}` };
  }
  
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
    const supabase = createSupabaseAdminClient();
    const session = await getSession();

    if (!session) {
        return { success: false, message: 'You must be logged in to submit a review.' };
    }

    const validatedFields = ReviewSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { listingId, rating, comment } = validatedFields.data;
    
    const { data: listing, error: fetchError } = await supabase
        .from('listings')
        .select('reviews')
        .eq('id', listingId)
        .single();
    
    if (fetchError || !listing) {
        console.error(`[ADD_REVIEW_ACTION] Error fetching listing: ${fetchError?.message}`);
        return { success: false, message: `Could not find the listing.` };
    }

    const reviews = (listing.reviews || []) as Review[];
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
    
    const { error: updateError } = await supabase
        .from('listings')
        .update({ reviews: reviews })
        .eq('id', listingId);

    if (updateError) {
        console.error(`[ADD_REVIEW_ACTION] Error: ${updateError.message}`);
        return { success: false, message: `Failed to submit review: ${updateError.message}` };
    }

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
    if (!session || !hasPermission(session, 'review:approve')) {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    const { data: listing, error: fetchError } = await supabase
        .from('listings')
        .select('reviews')
        .eq('id', listingId)
        .single();

    if (fetchError || !listing) {
        return { success: false, message: 'Listing not found.' };
    }

    const reviews = (listing.reviews || []) as Review[];
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);

    if (reviewIndex === -1) {
        return { success: false, message: 'Review not found.' };
    }

    reviews[reviewIndex].status = 'approved';

    const approvedReviews = reviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;

    const { error: updateError } = await supabase
        .from('listings')
        .update({ reviews: reviews, rating: newAverageRating })
        .eq('id', listingId);

    if (updateError) {
        console.error(`[APPROVE_REVIEW_ACTION] Error: ${updateError.message}`);
        return { success: false, message: `Failed to approve review: ${updateError.message}` };
    }

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review approved successfully.' };
}


export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'review:delete')) {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    const { data: listing, error: fetchError } = await supabase
        .from('listings')
        .select('reviews')
        .eq('id', listingId)
        .single();
    
    if (fetchError || !listing) {
        return { success: false, message: 'Listing not found.' };
    }
    
    const reviews = (listing.reviews || []) as Review[];
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    
    const approvedReviews = updatedReviews.filter(r => r.status === 'approved');
    const newAverageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;

    const { error: updateError } = await supabase
        .from('listings')
        .update({ reviews: updatedReviews, rating: newAverageRating })
        .eq('id', listingId);

    if (updateError) {
        console.error(`[DELETE_REVIEW_ACTION] Error: ${updateError.message}`);
        return { success: false, message: `Failed to delete review: ${updateError.message}` };
    }

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

  const validatedFields = ToggleUserStatusSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  const { userId, status } = validatedFields.data;

  if (userId === session.id) {
    return { success: false, message: "You cannot change your own status." };
  }
  
  const { error } = await supabase.from('users').update({ status }).eq('id', userId);

  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: `User status has been updated to ${status}.` };
}

const MergeListingsSchema = z.object({
  primaryListingId: z.string(),
  listingIdsToMerge: z.array(z.string()).min(1, "At least one listing must be selected to merge."),
});

export async function mergeListingsAction(data: z.infer<typeof MergeListingsSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session || !hasPermission(session, 'listing:merge')) {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = MergeListingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
  
    const { primaryListingId, listingIdsToMerge } = validatedFields.data;
  
    const { error } = await supabase.rpc('merge_listings', {
      p_primary_listing_id: primaryListingId,
      p_listing_ids_to_merge: listingIdsToMerge
    });
  
    if (error) {
      console.error(`[MERGE_LISTINGS_ACTION] Error: ${error}`);
      return { success: false, message: `Failed to merge listings: ${error.message}` };
    }
  
    revalidatePath('/dashboard');
    return { success: true, message: `${listingIdsToMerge.length} listing(s) were successfully merged.` };
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

    const validatedFields = BulkDeleteListingsSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { listingIds } = validatedFields.data;

    const { error } = await supabase.rpc('bulk_delete_listings', { p_listing_ids: listingIds });

    if (error) {
        console.error(`[BULK_DELETE_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to delete listings: ${error.message}` };
    }
    
    revalidatePath('/dashboard');
    return { success: true, message: `${listingIds.length} listing(s) have been deleted.` };
}


const AdminBookingFormSchema = z.object({
    listingId: z.string().min(1, 'Please select a venue.'),
    userId: z.string().optional(),
    isNewUser: z.boolean().optional(),
    newUserName: z.string().optional(),
    newUserEmail: z.string().optional(),
    dates: z.object({
      from: z.date({ required_error: "A start date is required." }),
      to: z.date().optional(),
    }).refine(data => !!data.from, { message: "Start date is required" }),
    guests: z.coerce.number().int().min(1, "At least one guest is required."),
    numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
  }).refine(data => {
    return data.isNewUser ? data.newUserName && data.newUserEmail : data.userId;
  }, {
    message: "Either select an existing user or provide details for a new user.",
    path: ['userId'],
  }).refine(data => {
    return !data.isNewUser || (data.isNewUser && z.string().email().safeParse(data.newUserEmail).success);
  }, {
    message: "A valid email is required for new users.",
    path: ['newUserEmail'],
  });

export async function addBookingByAdminAction(data: z.infer<typeof AdminBookingFormSchema>) {
    await preloadPermissions();
    const supabase = createSupabaseAdminClient();
    const session = await getSession();

    if (!session || !hasPermission(session, 'booking:create')) {
        return { success: false, message: 'You do not have permission to create bookings.' };
    }

    const validatedFields = AdminBookingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { listingId, dates, guests, numberOfUnits, isNewUser, newUserName, newUserEmail, userId } = validatedFields.data;

    const { data: message, error } = await supabase.rpc('create_booking_with_inventory_check', {
        p_listing_id: listingId,
        p_user_id: userId,
        p_start_date: dates.from.toISOString(),
        p_end_date: (dates.to || dates.from).toISOString(),
        p_guests: guests,
        p_num_units: numberOfUnits,
        p_guest_email: isNewUser ? newUserEmail : undefined,
        p_guest_name: isNewUser ? newUserName : undefined,
        p_creator_id: session.id,
    });

    if (error) {
        console.error(`[ADMIN_CREATE_BOOKING_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to create booking: ${error.message}` };
    }

    revalidatePath('/bookings');
    revalidatePath('/dashboard/add-booking');
    redirect('/bookings');
}
