
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from './db'
import { randomUUID } from 'crypto'
import { createSession, getSession } from './session'
import { redirect } from 'next/navigation'
import type { User } from './types'
import { logToFile } from './logger'
import { hashPassword, verifyPassword } from './password'
import { cookies } from 'next/headers'
import { getListingById } from './data'
import { authenticateUser } from './auth'

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
});

export async function createListingAction(data: z.infer<typeof ListingFormSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images } = validatedFields.data;
    const featuresAsArray = features.split(',').map(f => f.trim());
    const newId = `listing-${randomUUID()}`;

    const defaultReviews = [];
    const defaultRating = 0;

    try {
        const db = await getDb();
        const stmt = db.prepare(`
            INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, currency, rating, reviews, features, maxGuests)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            newId,
            name,
            type,
            location,
            description,
            JSON.stringify(images),
            price,
            priceUnit,
            currency,
            defaultRating,
            JSON.stringify(defaultReviews),
            JSON.stringify(featuresAsArray),
            maxGuests
        );
        
        revalidatePath('/dashboard?tab=listings', 'page');
        return { success: true, message: `Listing "${name}" has been created.` };
    } catch (error) {
        console.error(`[CREATE_LISTING_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to create listing: ${message}` };
    }
}

export async function updateListingAction(id: string, data: z.infer<typeof ListingFormSchema>) {
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
  
  const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images } = validatedFields.data;
  const featuresAsArray = features.split(',').map((f) => f.trim());

  try {
    const db = await getDb();
    const stmt = db.prepare(`
      UPDATE listings
      SET 
        name = ?,
        type = ?,
        location = ?,
        description = ?,
        price = ?,
        priceUnit = ?,
        currency = ?,
        maxGuests = ?,
        features = ?,
        images = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      type,
      location,
      description,
      price,
      priceUnit,
      currency,
      maxGuests,
      JSON.stringify(featuresAsArray),
      JSON.stringify(images),
      id
    );

    revalidatePath('/dashboard?tab=listings', 'page');
    revalidatePath(`/listing/${id}`);
    revalidatePath('/bookings'); // Revalidate bookings in case listing name changed
    
    return { success: true, message: `The details for "${name}" have been saved.` };

  } catch (error) {
    console.error(`[UPDATE_LISTING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to update listing: ${message}` };
  }
}

export async function deleteListingAction(id: string) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    return { success: false, message: 'Unauthorized' };
  }

  try {
    const db = await getDb();
    const stmt = db.prepare('DELETE FROM listings WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return { success: false, message: 'Listing not found or could not be deleted.' };
    }

    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: 'Listing has been deleted.' };
  } catch (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Database error occurred while deleting the listing: ${message}` };
  }
}

const CreateBookingSchema = z.object({
  listingId: z.string(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
});

export async function createBookingAction(data: z.infer<typeof CreateBookingSchema>) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'You must be logged in to book.' };
  }
  
  if (session.role === 'staff') {
    return { success: false, message: 'Staff accounts cannot create new bookings.' };
  }

  const validatedFields = CreateBookingSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { listingId, startDate, endDate, guests } = validatedFields.data;

  try {
    const db = await getDb();

    const listingStmt = db.prepare('SELECT name FROM listings WHERE id = ?');
    const listing = listingStmt.get(listingId) as { name: string } | undefined;

    if (!listing) {
        return { success: false, message: 'The venue you are trying to book does not exist.' };
    }
    const listingName = listing.name;
    
    // Check for existing bookings on the same dates
    const existingBookingStmt = db.prepare(`
        SELECT id FROM bookings
        WHERE listingId = ? AND status = 'Confirmed' AND (
            -- Overlap check: (StartA <= EndB) AND (EndA >= StartB)
            endDate >= ? AND startDate <= ?
        )
    `);
    const existingBooking = existingBookingStmt.get(listingId, new Date(startDate).toISOString().split('T')[0], new Date(endDate).toISOString().split('T')[0]);

    if (existingBooking) {
        return { success: false, message: 'These dates are no longer available. Please select different dates.' };
    }

    const stmt = db.prepare(`
      INSERT INTO bookings (id, listingId, userId, startDate, endDate, guests, status, listingName, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      randomUUID(),
      listingId,
      session.id,
      new Date(startDate).toISOString().split('T')[0],
      new Date(endDate).toISOString().split('T')[0],
      guests,
      'Pending',
      listingName,
      new Date().toISOString()
    );

    revalidatePath('/bookings');
    revalidatePath(`/listing/${listingId}`);
    
    return { success: true, message: `Your booking request for ${listingName} is now pending confirmation.` };
  } catch (error) {
    console.error(`[CREATE_BOOKING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to create booking: ${message}` };
  }
}

const UpdateBookingSchema = z.object({
  bookingId: z.string(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
});

export async function updateBookingAction(data: z.infer<typeof UpdateBookingSchema>) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UpdateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { bookingId, startDate, endDate, guests } = validatedFields.data;

  try {
    const db = await getDb();
    const booking = db.prepare('SELECT userId, listingId FROM bookings WHERE id = ?').get(bookingId) as { userId: string, listingId: string } | undefined;

    if (!booking) {
      return { success: false, message: 'Booking not found.' };
    }

    if (session.role !== 'admin' && booking.userId !== session.id) {
      return { success: false, message: 'You do not have permission to edit this booking.' };
    }
    
    const listing = db.prepare('SELECT maxGuests FROM listings WHERE id = ?').get(booking.listingId) as { maxGuests: number } | undefined;
    if (listing && guests > listing.maxGuests) {
        return { success: false, message: `Number of guests cannot exceed the maximum of ${listing.maxGuests}.` };
    }

    const modifiedAt = new Date();
    const statusMessage = `Modified by ${session.name} on ${modifiedAt.toLocaleDateString()}. Awaiting re-confirmation.`;

    const stmt = db.prepare(`
      UPDATE bookings 
      SET startDate = ?, endDate = ?, guests = ?, status = 'Pending', statusMessage = ?, actionByUserId = NULL, actionAt = NULL
      WHERE id = ?
    `);
    
    const info = stmt.run(
        new Date(startDate).toISOString().split('T')[0],
        new Date(endDate).toISOString().split('T')[0],
        guests,
        statusMessage,
        bookingId
    );

    if (info.changes === 0) {
        return { success: false, message: 'Failed to update booking. No changes were made.' };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);

    return { success: true, message: 'Booking has been updated and is now pending re-confirmation.' };
  } catch (error) {
    console.error(`[UPDATE_BOOKING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to update booking: ${message}` };
  }
}

export async function logoutAction() {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (sessionId) {
        try {
            const db = await getDb();
            const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
            stmt.run(sessionId);
        } catch (error) {
            console.error(`[SESSION_DELETE] Error deleting session ${sessionId} from database: ${error}`);
        }
        
        cookieStore.set('session', '', {
            expires: new Date(0),
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
    }
    
    revalidatePath('/', 'layout');
    redirect('/login');
}


const UpdatePasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function updatePasswordAction(data: z.infer<typeof UpdatePasswordSchema>) {
  const validatedFields = UpdatePasswordSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid fields.' };
  }
  const { email, password } = validatedFields.data;

  try {
    const db = await getDb();
    const user = db.prepare('SELECT id, password FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user) {
      return { error: `Update failed: User with email "${email}" does not exist.` };
    }

    const hashedPassword = await hashPassword(password);

    const stmt = db.prepare('UPDATE users SET password = ? WHERE email = ?');
    const info = stmt.run(hashedPassword, email);
    if (info.changes === 0) {
        return { error: 'Database update failed: Could not find user to update.' };
    }

    // --- Automatic Verification Step ---
    const updatedUser = db.prepare('SELECT id, password FROM users WHERE email = ?').get(email) as User | undefined;
    if (!updatedUser || !updatedUser.password) {
      return { error: 'Verification failed: Password was updated, but user could not be found immediately after.' };
    }

    const passwordsMatch = await verifyPassword(password, updatedUser.password);

    if (passwordsMatch) {
      return { success: `Password for ${email} was updated and verified successfully.` };
    } else {
      return { error: `Verification FAILED: The password for ${email} was updated, but it could not be verified. This indicates a potential problem with the hashing or database logic.` };
    }

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `An unexpected error occurred during the process: ${errorMessage}` };
  }
}

const TestLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function testLoginAction(data: z.infer<typeof TestLoginSchema>) {
  const validatedFields = TestLoginSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid fields provided.' };
  }
  const { email, password } = validatedFields.data;

  try {
    const authResult = await authenticateUser(email, password);
    if (authResult.error) {
      return { error: authResult.error };
    }
    
    const { user } = authResult;
    const sessionId = await createSession(user.id);
    if (!sessionId) {
      return { error: 'Server error: Could not create a session record in the database.' };
    }

    return { success: sessionId };
  } catch (error) {
    console.error('[TEST_LOGIN_ACTION_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { error: errorMessage };
  }
}

const GetSessionByEmailSchema = z.object({
  email: z.string().email(),
});

export async function getSessionTokenByEmailAction(data: z.infer<typeof GetSessionByEmailSchema>) {
    const validatedFields = GetSessionByEmailSchema.safeParse(data);
    if (!validatedFields.success) {
        return { error: 'Invalid email provided.' };
    }
    const { email } = validatedFields.data;

    try {
        const db = await getDb();
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;

        if (!user) {
            return { error: `No user found with email: ${email}` };
        }

        const session = db.prepare('SELECT id FROM sessions WHERE userId = ? AND expiresAt > ? ORDER BY expiresAt DESC LIMIT 1').get(user.id, new Date().toISOString()) as { id: string } | undefined;

        if (!session) {
            return { error: `No active session found for user: ${email}` };
        }

        return { success: session.id };
    } catch (error) {
        console.error('[GET_SESSION_BY_EMAIL_ACTION_ERROR]', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { error: `Database query failed: ${errorMessage}` };
    }
}

export async function verifySessionByIdAction(sessionId: string) {
    if (!sessionId) {
        return { error: 'No Session ID provided to verify.' };
    }

    try {
        const db = await getDb();
        const sessionRecord = db.prepare('SELECT userId, expiresAt FROM sessions WHERE id = ?').get(sessionId) as { userId: string, expiresAt: string } | undefined;

        if (!sessionRecord) {
            return { error: `Session with ID "${sessionId}" was not found in the database.` };
        }

        const expiresAtDate = new Date(sessionRecord.expiresAt);
        if (expiresAtDate < new Date()) {
             return { error: `Session with ID "${sessionId}" was found but has expired on ${expiresAtDate.toLocaleString()}.` };
        }

        const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(sessionRecord.userId) as User | undefined;
        if (!user) {
            return { error: `Session is valid, but the associated user (ID: ${sessionRecord.userId}) could not be found.` };
        }

        cookies().set('session', sessionId, {
          expires: expiresAtDate,
          httpOnly: true,
          path: '/',
          secure: true,
          sameSite: 'none',
        });

        const successMessage = `Session for ${user.email} (${user.role}) is valid until ${expiresAtDate.toLocaleString()}. Cookie set.`;
        return { success: successMessage };
    } catch (error) {
        console.error('[VERIFY_SESSION_BY_ID_ACTION_ERROR]', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { error: `Database query failed: ${errorMessage}` };
    }
}

const BookingActionSchema = z.object({
  bookingId: z.string(),
});

export async function cancelBookingAction(data: z.infer<typeof BookingActionSchema>) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = BookingActionSchema.safeParse(data);
  if (!validatedFields.success) {
    return { error: 'Invalid booking ID.' };
  }
  
  const { bookingId } = validatedFields.data;

  try {
    const db = await getDb();
    const booking = db.prepare(`
        SELECT b.userId, l.name as listingName 
        FROM bookings b
        JOIN listings l ON b.listingId = l.id
        WHERE b.id = ?
    `).get(bookingId) as { userId: string, listingName: string } | undefined;

    if (!booking) {
      return { error: 'Booking not found.' };
    }

    if (session.role === 'staff') {
        return { error: 'You do not have permission to cancel this booking.' };
    }

    // Admin can cancel any booking, guest can only cancel their own.
    if (session.role !== 'admin' && booking.userId !== session.id) {
      return { error: 'You do not have permission to cancel this booking.' };
    }
    
    const actionAt = new Date().toISOString();
    const statusMessage = `Cancelled by ${session.name} on ${new Date(actionAt).toLocaleDateString()}`;

    const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'Cancelled', actionByUserId = ?, actionAt = ?, statusMessage = ?
        WHERE id = ?`);
    const info = stmt.run(session.id, actionAt, statusMessage, bookingId);
    
    if (info.changes === 0) {
        return { error: 'Failed to cancel booking.' };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);
    
    return { success: `Booking for ${booking.listingName} has been cancelled.` };
  } catch (error) {
    console.error(`[CANCEL_BOOKING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { error: `Failed to cancel booking in the database: ${message}` };
  }
}

export async function confirmBookingAction(data: z.infer<typeof BookingActionSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return { error: 'Unauthorized: Only administrators can confirm bookings.' };
    }
  
    const validatedFields = BookingActionSchema.safeParse(data);
    if (!validatedFields.success) {
      return { error: 'Invalid booking ID.' };
    }
    
    const { bookingId } = validatedFields.data;
  
    try {
      const db = await getDb();
      const booking = db.prepare(`
        SELECT l.name as listingName 
        FROM bookings b
        JOIN listings l ON b.listingId = l.id
        WHERE b.id = ?
      `).get(bookingId) as { listingName: string } | undefined;
  
      if (!booking) {
        return { error: 'Booking not found.' };
      }
      
      const actionAt = new Date().toISOString();
      const statusMessage = `Confirmed by ${session.name} on ${new Date(actionAt).toLocaleDateString()}`;
  
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'Confirmed', actionByUserId = ?, actionAt = ?, statusMessage = ?
        WHERE id = ? AND status = 'Pending'`);
      const info = stmt.run(session.id, actionAt, statusMessage, bookingId);
      
      if (info.changes === 0) {
          return { error: 'Failed to confirm booking. It might not be in a pending state.' };
      }
  
      revalidatePath('/bookings');
      revalidatePath(`/booking/${bookingId}`);
      
      return { success: `Booking for ${booking.listingName} has been confirmed.` };
    } catch (error) {
      console.error(`[CONFIRM_BOOKING_ACTION] Error: ${error}`);
      const message = error instanceof Error ? error.message : "An unknown database error occurred.";
      return { error: `Failed to confirm booking in the database: ${message}` };
    }
}

const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  role: z.enum(['admin', 'guest', 'staff']),
  status: z.enum(['active', 'disabled']),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function addUserAction(data: z.infer<typeof UserFormSchema>) {
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

  try {
    const db = await getDb();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return { success: false, message: 'A user with this email already exists.' };
    }
    
    const hashedPassword = await hashPassword(password);
    const userId = `user-${randomUUID()}`;

    const stmt = db.prepare('INSERT INTO users (id, name, email, password, role, status, notes, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(userId, name, email, hashedPassword, role, status, notes || null, phone || null);

    revalidatePath('/dashboard?tab=users', 'page');
    return { success: true, message: `User "${name}" was created successfully.` };
  } catch (error) {
    console.error(`[ADD_USER_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to create user in the database: ${message}` };
  }
}

export async function updateUserAction(id: string, data: z.infer<typeof UserFormSchema>) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UserFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, role, status, notes, phone } = validatedFields.data;
  
  try {
    const db = await getDb();
    
    // Check if another user already has the new email
    const otherUserWithEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
    if (otherUserWithEmail) {
        return { success: false, message: 'Another user with this email already exists.' };
    }

    if (password) {
      // Update with new password
      const hashedPassword = await hashPassword(password);
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ?, status = ?, notes = ?, phone = ? WHERE id = ?');
      stmt.run(name, email, hashedPassword, role, status, notes || null, phone || null, id);
    } else {
      // Update without changing password
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ?, notes = ?, phone = ? WHERE id = ?');
      stmt.run(name, email, role, status, notes || null, phone || null, id);
    }

    revalidatePath('/dashboard?tab=users', 'page');
    revalidatePath(`/dashboard/edit-user/${id}`);
    
    return { success: true, message: `User "${name}" was updated successfully.` };
  } catch (error) {
    console.error(`[UPDATE_USER_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to update user in the database: ${message}` };
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateUserProfileAction(data: z.infer<typeof UpdateProfileSchema>) {
  const session = await getSession();
  if (!session) {
    return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password, notes, phone } = validatedFields.data;

  try {
    const db = await getDb();
    
    const otherUserWithEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, session.id);
    if (otherUserWithEmail) {
        return { success: false, message: 'Another user with this email already exists.' };
    }

    if (password) {
      const hashedPassword = await hashPassword(password);
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, password = ?, notes = ?, phone = ? WHERE id = ?');
      stmt.run(name, email, hashedPassword, notes || null, phone || null, session.id);
    } else {
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, notes = ?, phone = ? WHERE id = ?');
      stmt.run(name, email, notes || null, phone || null, session.id);
    }

    revalidatePath('/profile');
    revalidatePath('/', 'layout');
    
    return { success: true, message: `Your profile has been updated successfully.` };
  } catch (error) {
    console.error(`[UPDATE_PROFILE_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Failed to update your profile in the database: ${message}` };
  }
}

const ReviewSchema = z.object({
    listingId: z.string(),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().min(10, "Comment must be at least 10 characters long.")
});

export async function addOrUpdateReviewAction(data: z.infer<typeof ReviewSchema>) {
    const session = await getSession();
    if (!session) {
        return { success: false, message: 'You must be logged in to submit a review.' };
    }

    const validatedFields = ReviewSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { listingId, rating, comment } = validatedFields.data;

    try {
        const db = await getDb();
        const listing = await getListingById(listingId);

        if (!listing) {
            return { success: false, message: 'Listing not found.' };
        }

        let reviews = listing.reviews;
        const existingReviewIndex = reviews.findIndex(r => r.userId === session.id);
        
        if (existingReviewIndex > -1) {
            // Update existing review
            reviews[existingReviewIndex].rating = rating;
            reviews[existingReviewIndex].comment = comment;
        } else {
            // Add new review
            const newReview = {
                id: `review-${randomUUID()}`,
                userId: session.id,
                author: session.name,
                avatar: `https://avatar.vercel.sh/${session.email}.png`,
                rating,
                comment,
            };
            reviews.push(newReview);
        }

        // Recalculate average rating
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const newAverageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        const stmt = db.prepare(`
            UPDATE listings
            SET reviews = ?, rating = ?
            WHERE id = ?
        `);
        
        stmt.run(JSON.stringify(reviews), newAverageRating, listingId);

        revalidatePath(`/listing/${listingId}`);
        return { success: true, message: 'Your review has been submitted successfully!' };

    } catch (error) {
        console.error(`[ADD_REVIEW_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to submit review: ${message}` };
    }
}

const ToggleUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['active', 'disabled']),
});

export async function toggleUserStatusAction(data: z.infer<typeof ToggleUserStatusSchema>) {
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

  try {
    const db = await getDb();
    const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
    const info = stmt.run(status, userId);

    if (info.changes === 0) {
      return { success: false, message: 'User not found or status is already the same.' };
    }

    revalidatePath('/dashboard?tab=users', 'page');
    return { success: true, message: `User status has been updated to ${status}.` };
  } catch (error) {
    console.error(`[TOGGLE_USER_STATUS_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `Database error: ${message}` };
  }
}

const BulkCreateListingsSchema = z.object({
  originalListingId: z.string(),
  count: z.coerce.number().int().min(1, "Must create at least 1 duplicate.").max(50, "Cannot create more than 50 duplicates at once."),
});

export async function bulkCreateListingsAction(data: z.infer<typeof BulkCreateListingsSchema>) {
  const session = await getSession();
  if (session?.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
  }

  const validatedFields = BulkCreateListingsSchema.safeParse(data);
  if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
  }

  const { originalListingId, count } = validatedFields.data;

  try {
      const db = await getDb();
      const originalListing = await getListingById(originalListingId);

      if (!originalListing) {
          return { success: false, message: 'Original listing not found.' };
      }
      
      const insertStmt = db.prepare(`
          INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, currency, rating, reviews, features, maxGuests)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const createDuplicates = db.transaction((listingsToCreate) => {
        for (const listing of listingsToCreate) {
          insertStmt.run(
            listing.id,
            listing.name,
            listing.type,
            listing.location,
            listing.description,
            JSON.stringify(listing.images),
            listing.price,
            listing.priceUnit,
            listing.currency,
            listing.rating,
            JSON.stringify(listing.reviews),
            JSON.stringify(listing.features),
            listing.maxGuests
          );
        }
        return { count: listingsToCreate.length };
      });
      
      const listingsToCreate = [];
      for (let i = 0; i < count; i++) {
        listingsToCreate.push({
          ...originalListing,
          id: `listing-${randomUUID()}`,
          // Name is kept the same as per request "exact duplicates"
        });
      }

      const result = createDuplicates(listingsToCreate);
      
      revalidatePath('/dashboard?tab=listings', 'page');
      return { success: true, message: `${result.count} duplicate(s) of "${originalListing.name}" created successfully.` };
  } catch (error) {
      console.error(`[BULK_CREATE_LISTINGS_ACTION] Error: ${error}`);
      const message = error instanceof Error ? error.message : "An unknown database error occurred.";
      return { success: false, message: `Failed to create duplicates: ${message}` };
  }
}
