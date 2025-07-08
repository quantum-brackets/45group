
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from './session'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient, createSupabaseServerClient } from './supabase'
import { hashPassword } from './password'
import { logout as sessionLogout } from './session'

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
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
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
        p_images: JSON.stringify(images),
        p_price: price,
        p_price_unit: price_unit,
        p_currency: currency,
        p_max_guests: max_guests,
        p_features: JSON.stringify(features.split(',').map(f => f.trim())),
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
  const supabase = createSupabaseAdminClient();
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
    p_features: JSON.stringify(features.split(',').map(f => f.trim())),
    p_images: JSON.stringify(images),
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
  const supabase = createSupabaseAdminClient();
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
  listing_id: z.string(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  number_of_units: z.coerce.number().int().min(1, "At least one unit is required."),
  guest_email: z.string().email("Please enter a valid email address.").optional(),
});

export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  const supabase = createSupabaseAdminClient();
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

  const { listing_id, start_date, end_date, guests, number_of_units, guest_email } = validatedFields.data;
  
  const { data: message, error } = await supabase.rpc('create_booking_with_inventory_check', {
    p_listing_id: listing_id,
    p_user_id: session?.id || null,
    p_start_date: new Date(start_date).toISOString(),
    p_end_date: new Date(end_date).toISOString(),
    p_guests: guests,
    p_num_units: number_of_units,
    p_guest_email: guest_email
  });

  if (error) {
    console.error(`[CREATE_BOOKING_ACTION] Error: ${error}`);
    return { success: false, message: `Failed to create booking: ${error.message}` };
  }
  
  revalidatePath('/bookings');
  revalidatePath(`/listing/${listing_id}`);
  
  return { success: true, message: message as string };
}

const UpdateBookingSchema = z.object({
  booking_id: z.string(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  number_of_units: z.coerce.number().int().min(1, "At least one unit is required."),
});

export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = UpdateBookingSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { booking_id, start_date, end_date, guests, number_of_units } = validatedFields.data;

    const { error } = await supabase.rpc('update_booking_with_inventory_check', {
        p_booking_id: booking_id,
        p_new_start_date: new Date(start_date).toISOString(),
        p_new_end_date: new Date(end_date).toISOString(),
        p_new_guests: guests,
        p_new_num_units: number_of_units,
        p_editor_id: session.id,
        p_editor_name: session.name
    });

    if (error) {
        console.error(`[UPDATE_BOOKING_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to update booking: ${error.message}` };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${booking_id}`);

    return { success: true, message: 'Booking has been updated and is now pending re-confirmation.' };
}

export async function logoutAction() {
    await sessionLogout();
    redirect('/login');
}

const BookingActionSchema = z.object({
  booking_id: z.string(),
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
  
  const { booking_id } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase.from('bookings').select('user_id, listing_name:listings(name)').eq('id', booking_id).single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }
  
  if (session.role === 'staff') {
      return { error: 'You do not have permission to cancel this booking.' };
  }
  
  if (session.role !== 'admin' && booking.user_id !== session.id) {
    return { error: 'You do not have permission to cancel this booking.' };
  }

  const { error } = await supabase.from('bookings').update({
    status: 'Cancelled',
    action_by_user_id: session.id,
    action_at: new Date().toISOString(),
    status_message: `Cancelled by ${session.name} on ${new Date().toLocaleDateString()}`
  }).eq('id', booking_id);
  
  if (error) {
    return { error: `Failed to cancel booking in the database: ${error.message}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/booking/${booking_id}`);
  
  return { success: `Booking for ${(booking.listing_name as any)?.name} has been cancelled.` };
}

export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
      return { error: 'Unauthorized: Only administrators can confirm bookings.' };
    }
  
    const validatedFields = BookingActionSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid booking ID.' };
    }
    
    const { booking_id } = validatedFields.data;
  
    const { error } = await supabase.rpc('confirm_booking_with_inventory_check', {
        p_booking_id: booking_id,
        p_admin_id: session.id,
        p_admin_name: session.name
    });

    if (error) {
        console.error(`[CONFIRM_BOOKING_ACTION] Error: ${error}`);
        return { error: error.message };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${booking_id}`);
    
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
  const supabase = createSupabaseAdminClient();
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
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
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
    listing_id: z.string(),
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

    const { listing_id, rating, comment } = validatedFields.data;
    
    const { error } = await supabase.rpc('add_or_update_review', {
        p_listing_id: listing_id,
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

    revalidatePath(`/listing/${listing_id}`);
    return { success: true, message: 'Your review has been submitted and is awaiting approval.' };
}


const ReviewActionSchema = z.object({
  listing_id: z.string(),
  review_id: z.string(),
});

export async function approveReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listing_id, review_id } = data;

    const { error } = await supabase.rpc('approve_review', {
        p_listing_id: listing_id,
        p_review_id: review_id
    });

    if (error) {
        console.error(`[APPROVE_REVIEW_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to approve review: ${error.message}` };
    }

    revalidatePath(`/listing/${listing_id}`);
    return { success: true, message: 'Review approved successfully.' };
}


export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listing_id, review_id } = data;

    const { error } = await supabase.rpc('delete_review', {
        p_listing_id: listing_id,
        p_review_id: review_id
    });

    if (error) {
        console.error(`[DELETE_REVIEW_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to delete review: ${error.message}` };
    }

    revalidatePath(`/listing/${listing_id}`);
    return { success: true, message: 'Review deleted successfully.' };
}

const ToggleUserStatusSchema = z.object({
  user_id: z.string(),
  status: z.enum(['active', 'disabled']),
});

export async function toggleUserStatusAction(data: z.infer<typeof ToggleUserStatusSchema>) {
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (session?.role !== 'admin') {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = ToggleUserStatusSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  const { user_id, status } = validatedFields.data;

  if (user_id === session.id) {
    return { success: false, message: "You cannot change your own status." };
  }
  
  const { error } = await supabase.from('users').update({ status }).eq('id', user_id);

  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidatePath('/dashboard?tab=users', 'page');
  return { success: true, message: `User status has been updated to ${status}.` };
}

const MergeListingsSchema = z.object({
  primary_listing_id: z.string(),
  listing_ids_to_merge: z.array(z.string()).min(1, "At least one listing must be selected to merge."),
});

export async function mergeListingsAction(data: z.infer<typeof MergeListingsSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = MergeListingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
  
    const { primary_listing_id, listing_ids_to_merge } = validatedFields.data;
  
    const { error } = await supabase.rpc('merge_listings', {
      p_primary_listing_id: primary_listing_id,
      p_listing_ids_to_merge: listing_ids_to_merge
    });
  
    if (error) {
      console.error(`[MERGE_LISTINGS_ACTION] Error: ${error}`);
      return { success: false, message: `Failed to merge listings: ${error.message}` };
    }
  
    revalidatePath('/dashboard');
    return { success: true, message: `${listing_ids_to_merge.length} listing(s) were successfully merged.` };
}

const BulkDeleteListingsSchema = z.object({
  listing_ids: z.array(z.string()).min(1, "At least one listing must be selected for deletion."),
});

export async function bulkDeleteListingsAction(data: z.infer<typeof BulkDeleteListingsSchema>) {
    const supabase = createSupabaseAdminClient();
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = BulkDeleteListingsSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { listing_ids } = validatedFields.data;

    const { error } = await supabase.rpc('bulk_delete_listings', { p_listing_ids: listing_ids });

    if (error) {
        console.error(`[BULK_DELETE_ACTION] Error: ${error}`);
        return { success: false, message: `Failed to delete listings: ${error.message}` };
    }
    
    revalidatePath('/dashboard');
    return { success: true, message: `${listing_ids.length} listing(s) have been deleted.` };
}
