
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from './db'
import { randomUUID } from 'crypto'
import { createSession, deleteSession, getSession } from './session'
import { redirect } from 'next/navigation'
import type { User } from './types'
import { logToFile } from './logger'
import { hashPassword, verifyPassword } from './password'
import { cookies } from 'next/headers'

const ListingFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(['hotel', 'events', 'restaurant']),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  priceUnit: z.enum(['night', 'hour', 'person']),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN']),
  maxGuests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
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

    const { name, type, location, description, price, priceUnit, maxGuests, features, currency } = validatedFields.data;
    const featuresAsArray = features.split(',').map(f => f.trim());
    const newId = `listing-${randomUUID()}`;

    const defaultImages = ['https://placehold.co/800x600.png', 'https://placehold.co/800x600.png'];
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
            JSON.stringify(defaultImages),
            price,
            priceUnit,
            currency,
            defaultRating,
            JSON.stringify(defaultReviews),
            JSON.stringify(featuresAsArray),
            maxGuests
        );

        revalidatePath('/dashboard');
        return { success: true, message: `Listing "${name}" has been created.` };
    } catch (error) {
        console.error(`[CREATE_LISTING_ACTION] Error: ${error}`);
        return { success: false, message: "Failed to create listing in the database." };
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
  
  const { name, type, location, description, price, priceUnit, maxGuests, features, currency } = validatedFields.data;
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
        maxGuests = ?,
        features = ?,
        currency = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      type,
      location,
      description,
      price,
      priceUnit,
      maxGuests,
      JSON.stringify(featuresAsArray),
      currency,
      id
    );

    revalidatePath('/admin');
    revalidatePath(`/listing/${id}`);
    
    return { success: true, message: `The details for "${name}" have been saved.` };
  } catch (error) {
    console.error(`[UPDATE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: "Failed to update listing in the database." };
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

    revalidatePath('/dashboard');
    return { success: true, message: 'Listing has been deleted.' };
  } catch (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return { success: false, message: 'Database error occurred while deleting the listing.' };
  }
}

const CreateBookingSchema = z.object({
  listingId: z.string(),
  listingName: z.string(),
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

  const { listingId, listingName, startDate, endDate, guests } = validatedFields.data;

  try {
    const db = await getDb();
    const stmt = db.prepare(`
      INSERT INTO bookings (id, listingId, userId, startDate, endDate, guests, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      randomUUID(),
      listingId,
      session.id,
      new Date(startDate).toISOString().split('T')[0],
      new Date(endDate).toISOString().split('T')[0],
      guests,
      'Confirmed'
    );

    revalidatePath('/bookings');
    revalidatePath(`/listing/${listingId}`);
    
    return { success: true, message: `Your booking at ${listingName} has been confirmed.` };
  } catch (error)
    {
    console.error(`[CREATE_BOOKING_ACTION] Error: ${error}`);
    return { success: false, message: "Failed to create booking in the database." };
  }
}

export async function logoutAction() {
    await deleteSession();
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
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user || !user.password) {
      return { error: 'Incorrect email or password.' };
    }

    const passwordsMatch = await verifyPassword(password, user.password);
    if (!passwordsMatch) {
      return { error: 'Incorrect email or password.' };
    }
    
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
          sameSite: 'lax',
          secure: true,
        });

        const successMessage = `Session for ${user.email} (${user.role}) is valid until ${expiresAtDate.toLocaleString()}. Cookie set.`;
        return { success: successMessage };
    } catch (error) {
        console.error('[VERIFY_SESSION_BY_ID_ACTION_ERROR]', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { error: `Database query failed: ${errorMessage}` };
    }
}

const CancelBookingSchema = z.object({
  bookingId: z.string(),
});

export async function cancelBookingAction(data: z.infer<typeof CancelBookingSchema>) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = CancelBookingSchema.safeParse(data);
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

    const stmt = db.prepare(`UPDATE bookings SET status = 'Cancelled' WHERE id = ?`);
    const info = stmt.run(bookingId);
    
    if (info.changes === 0) {
        return { error: 'Failed to cancel booking.' };
    }

    revalidatePath('/bookings');
    revalidatePath(`/booking/${bookingId}`);
    
    return { success: `Booking for ${booking.listingName} has been cancelled.` };
  } catch (error) {
    console.error(`[CANCEL_BOOKING_ACTION] Error: ${error}`);
    return { error: "Failed to cancel booking in the database." };
  }
}

const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  role: z.enum(['admin', 'guest', 'staff']),
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

  const { name, email, password, role } = validatedFields.data;

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

    const stmt = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, name, email, hashedPassword, role);

    revalidatePath('/dashboard');
    return { success: true, message: `User "${name}" was created successfully.` };
  } catch (error) {
    console.error(`[ADD_USER_ACTION] Error: ${error}`);
    return { success: false, message: "Failed to create user in the database." };
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

  const { name, email, password, role } = validatedFields.data;
  
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
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?');
      stmt.run(name, email, hashedPassword, role, id);
    } else {
      // Update without changing password
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?');
      stmt.run(name, email, role, id);
    }

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/edit-user/${id}`);
    
    return { success: true, message: `User "${name}" was updated successfully.` };
  } catch (error) {
    console.error(`[UPDATE_USER_ACTION] Error: ${error}`);
    return { success: false, message: "Failed to update user in the database." };
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
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

  const { name, email, password } = validatedFields.data;

  try {
    const db = await getDb();
    
    const otherUserWithEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, session.id);
    if (otherUserWithEmail) {
        return { success: false, message: 'Another user with this email already exists.' };
    }

    if (password) {
      const hashedPassword = await hashPassword(password);
      const stmt = db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?');
      stmt.run(name, email, hashedPassword, session.id);
    } else {
      const stmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
      stmt.run(name, email, session.id);
    }

    revalidatePath('/profile');
    revalidatePath('/', 'layout');
    
    return { success: true, message: `Your profile has been updated successfully.` };
  } catch (error) {
    console.error(`[UPDATE_PROFILE_ACTION] Error: ${error}`);
    return { success: false, message: "Failed to update your profile in the database." };
  }
}
