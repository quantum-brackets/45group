
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from './session'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createSupabaseServerClient } from './supabase'

const ListingFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(['hotel', 'events', 'restaurant'], { required_error: "Type is required."}),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  priceUnit: z.enum(['night', 'hour', 'person'], { required_error: "Price unit is required."}),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN'], { required_error: "Currency is required."}),
  maxGuests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
  images: z.array(z.string().url({ message: "Please enter a valid image URL." })).min(1, "At least one image is required."),
  inventoryCount: z.coerce.number().int().min(0, "Inventory count must be 0 or more."),
});


export async function createListingAction(data: z.infer<typeof ListingFormSchema>) {
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images, inventoryCount } = validatedFields.data;
    
    const { error } = await supabase.rpc('create_listing_with_inventory', {
        p_id: `listing-${randomUUID()}`,
        p_name: name,
        p_type: type,
        p_location: location,
        p_description: description,
        p_images: JSON.stringify(images),
        p_price: price,
        p_price_unit: priceUnit,
        p_currency: currency,
        p_max_guests: maxGuests,
        p_features: JSON.stringify(features.split(',').map(f => f.trim())),
        p_inventory_count: inventoryCount
    });

    if (error) {
        console.error('[CREATE_LISTING_ACTION] Error:', error);
        return { success: false, message: `Failed to create listing: ${error.message}` };
    }
        
    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: `Listing "${name}" has been created with ${inventoryCount} units.` };
}

export async function updateListingAction(id: string, data: z.infer<typeof ListingFormSchema>) {
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
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
  
  const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images, inventoryCount } = validatedFields.data;

  const { error } = await supabase.rpc('update_listing_with_inventory', {
    p_listing_id: id,
    p_name: name,
    p_type: type,
    p_location: location,
    p_description: description,
    p_price: price,
    p_price_unit: priceUnit,
    p_currency: currency,
    p_max_guests: maxGuests,
    p_features: JSON.stringify(features.split(',').map(f => f.trim())),
    p_images: JSON.stringify(images),
    p_new_inventory_count: inventoryCount
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
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
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
  const supabase = createSupabaseServerClient();
  const session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  if (session?.role === 'staff') {
    return { success: false, message: 'Staff accounts cannot create new bookings.' };
  }

  const { listingId, startDate, endDate, guests, numberOfUnits, guestEmail } = validatedFields.data;
  
  const { data: message, error } = await supabase.rpc('create_booking_with_inventory_check', {
    p_listing_id: listingId,
    p_user_id: session?.id || null,
    p_start_date: new Date(startDate).toISOString(),
    p_end_date: new Date(endDate).toISOString(),
    p_guests: guests,
    p_num_units: numberOfUnits,
    p_guest_email: guestEmail
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
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { bookingId, startDate, endDate, guests, numberOfUnits } = validatedFields.data;

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
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/login');
}

const UpdatePasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// This action is for admins to reset passwords. A user-initiated password reset
// would use Supabase's built-in email flow.
export async function updatePasswordAction(data: z.infer<typeof UpdatePasswordSchema>) {
    const supabase = createSupabaseServerClient();
    const validatedFields = UpdatePasswordSchema.safeParse(data);
    if (!validatedFields.success) {
        return { error: 'Invalid fields.' };
    }
    const { email, password } = validatedFields.data;

    const { data: user, error: userError } = await supabase.from('users').select('id').eq('email', email).single();

    if (userError || !user) {
        return { error: `Update failed: User with email "${email}" does not exist.` };
    }
    
    const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: password }
    );
    
    if (error) {
        console.error('[UPDATE_PASSWORD_ACTION] Supabase Error:', error);
        return { error: `Password update failed: ${error.message}` };
    }
    
    return { success: `Password for ${email} was updated successfully.` };
}

const BookingActionSchema = z.object({
  bookingId: z.string(),
});

export async function cancelBookingAction(data: z.infer<typeof BookingActionSchema>) {
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = BookingActionSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid booking ID.' };
  }
  
  const { bookingId } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('userId, listingName').eq('id', bookingId).single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }
  
  if (session.role === 'staff') {
      return { error: 'You do not have permission to cancel this booking.' };
  }
  
  // Admin can cancel any booking, guest can only cancel their own.
  if (session.role !== 'admin' && booking.userId !== session.id) {
    return { error: 'You do not have permission to cancel this booking.' };
  }

  const { error } = await supabase.from('bookings').update({
    status: 'Cancelled',
    actionByUserId: session.id,
    actionAt: new Date().toISOString(),
    statusMessage: `Cancelled by ${session.name} on ${new Date().toLocaleDateString()}`
  }).eq('id', bookingId);
  
  if (error) {
    return { error: `Failed to cancel booking in the database: ${error.message}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/booking/${bookingId}`);
  
  return { success: `Booking for ${booking.listingName} has been cancelled.` };
}

export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
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
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
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

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm user
    user_metadata: { name }
  });

  if (authError || !authData.user) {
    return { success: false, message: authError?.message || 'Failed to create user.' };
  }

  // The trigger 'on_auth_user_created' creates the public user record.
  // Now, we update it with the additional details.
  const { error: profileError } = await supabase.from('users').update({
    role, status, notes, phone
  }).eq('id', authData.user.id);
  
  if (profileError) {
    // Attempt to clean up the auth user if profile update fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, message: `Failed to set user profile: ${profileError.message}` };
  }

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: `User "${name}" was created successfully.` };
}

export async function updateUserAction(id: string, data: z.infer<typeof UserFormSchema>) {
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UserFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, role, status, notes, phone } = validatedFields.data;
  
  // Update auth user if password or email changes
  if (password) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) return { success: false, message: `Failed to update password: ${error.message}` };
  }
  
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(id);
  if(authErr || !authUser.user) return { success: false, message: 'Could not fetch user to update.' };
  
  if (email !== authUser.user.email) {
    const { error } = await supabase.auth.admin.updateUserById(id, { email });
    if (error) return { success: false, message: `Failed to update email: ${error.message}` };
  }

  // Update public profile
  const { error: profileError } = await supabase.from('users').update({
    name, email, role, status, notes, phone
  }).eq('id', id);

  if (profileError) {
    return { success: false, message: `Failed to update user profile: ${profileError.message}` };
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
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, notes, phone } = validatedFields.data;

  // Update auth user
  if (password) {
    const { error } = await supabase.auth.updateUser({ password });
    if(error) return { success: false, message: `Failed to update password: ${error.message}` };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user && email !== user.email) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { success: false, message: `Failed to update email: ${error.message}` };
  }
  
  if (user && name !== user.user_metadata.name) {
    const { error } = await supabase.auth.updateUser({ data: { name } });
    if(error) return { success: false, message: `Failed to update name: ${error.message}` };
  }

  // Update public profile
  const { error: profileError } = await supabase.from('users').update({
    name, email, notes, phone
  }).eq('id', session.id);

  if (profileError) {
    return { success: false, message: `Failed to update profile: ${profileError.message}` };
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
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (!session) {
        return { success: false, message: 'You must be logged in to submit a review.' };
    }

    const validatedFields = ReviewSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { listingId, rating, comment } = validatedFields.data;
    
    const { error } = await supabase.rpc('add_or_update_review', {
        p_listing_id: listingId,
        p_user_id: session.id,
        p_author_name: session.name,
        p_avatar_url: `https://avatar.vercel.sh/${session.email}.png`,
        p_rating: rating,
        p_comment: comment
    });

    if (error) {
        console.error(`[ADD_REVIEW_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to submit review: ${error.message}` };
    }

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Your review has been submitted and is awaiting approval.' };
}


const ReviewActionSchema = z.object({
  listingId: z.string(),
  reviewId: z.string(),
});

export async function approveReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    const { error } = await supabase.rpc('approve_review', {
        p_listing_id: listingId,
        p_review_id: reviewId
    });

    if (error) {
        console.error(`[APPROVE_REVIEW_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to approve review: ${error.message}` };
    }

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review approved successfully.' };
}


export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    const { error } = await supabase.rpc('delete_review', {
        p_listing_id: listingId,
        p_review_id: reviewId
    });

    if (error) {
        console.error(`[DELETE_REVIEW_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to delete review: ${error.message}` };
    }

    revalidatePath(`/listing/${listingId}`);
    return { success: true, message: 'Review deleted successfully.' };
}

const ToggleUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['active', 'disabled']),
});

export async function toggleUserStatusAction(data: z.infer<typeof ToggleUserStatusSchema>) {
  const supabase = createSupabaseServerClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
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
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
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
    const supabase = createSupabaseServerClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
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
