
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from './db'
import { randomUUID } from 'crypto'
import { createSession, getSession } from './session'
import { redirect } from 'next/navigation'
import type { Review, User } from './types'
import { logToFile } from './logger'
import { hashPassword, verifyPassword } from './password'
import { cookies } from 'next/headers'
import { getInventoryByListingId, getListingById, getListingsByIds } from './data'
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
  inventoryCount: z.coerce.number().int().min(0, "Inventory count must be 0 or more."),
});

const BulkCreateSchema = z.object({
  listingId: z.string(),
  count: z.coerce.number().int().min(1, "Please enter a number greater than 0."),
});

export async function bulkCreateListingsAction(data: z.infer<typeof BulkCreateSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = BulkCreateSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { listingId, count } = validatedFields.data;
    const originalListing = await getListingById(listingId);
    
    if (!originalListing) {
      return { success: false, message: "Original listing not found." };
    }

    // Exclude fields that should be unique or are generated
    const { id, rating, reviews, ...duplicatableData } = originalListing;

    try {
        const db = await getDb();
        const transaction = db.transaction(() => {
            const stmt = db.prepare(`
                INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, currency, rating, reviews, features, maxGuests)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (let i = 0; i < count; i++) {
                stmt.run(
                    `listing-${randomUUID()}`,
                    duplicatableData.name,
                    duplicatableData.type,
                    duplicatableData.location,
                    duplicatableData.description,
                    JSON.stringify(duplicatableData.images),
                    duplicatableData.price,
                    duplicatableData.priceUnit,
                    duplicatableData.currency,
                    0, // Default rating
                    '[]', // Default empty reviews
                    JSON.stringify(duplicatableData.features),
                    duplicatableData.maxGuests
                );
            }
        });

        transaction();
        
        revalidatePath('/dashboard?tab=listings', 'page');
        return { success: true, message: `${count} duplicate(s) of "${originalListing.name}" have been created.` };
    } catch (error) {
        console.error(`[BULK_CREATE_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to create duplicates: ${message}` };
    }
}

export async function createListingAction(data: z.infer<typeof ListingFormSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = ListingFormSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images, inventoryCount } = validatedFields.data;
    const featuresAsArray = features.split(',').map(f => f.trim());
    const newListingId = `listing-${randomUUID()}`;

    const defaultReviews = [];
    const defaultRating = 0;

    try {
        const db = await getDb();
        const transaction = db.transaction(() => {
            const listingStmt = db.prepare(`
                INSERT INTO listings (id, name, type, location, description, images, price, priceUnit, currency, rating, reviews, features, maxGuests)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            listingStmt.run(
                newListingId,
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

            const inventoryStmt = db.prepare('INSERT INTO listing_inventory (id, listingId, name) VALUES (?, ?, ?)');
            for (let i = 0; i < inventoryCount; i++) {
                inventoryStmt.run(`inv-${randomUUID()}`, newListingId, `${name} - Unit ${i + 1}`);
            }
        });

        transaction();
        
        revalidatePath('/dashboard?tab=listings', 'page');
        return { success: true, message: `Listing "${name}" has been created with ${inventoryCount} units.` };
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
  
  const { name, type, location, description, price, priceUnit, currency, maxGuests, features, images, inventoryCount } = validatedFields.data;
  const featuresAsArray = features.split(',').map((f) => f.trim());

  try {
    const db = await getDb();
    const transaction = db.transaction(() => {
        // 1. Update the parent listing details
        const stmt = db.prepare(`
        UPDATE listings
        SET 
            name = ?, type = ?, location = ?, description = ?, price = ?,
            priceUnit = ?, currency = ?, maxGuests = ?, features = ?, images = ?
        WHERE id = ?
        `);
        stmt.run(name, type, location, description, price, priceUnit, currency, maxGuests, JSON.stringify(featuresAsArray), JSON.stringify(images), id);
        
        // 2. Reconcile inventory count
        const currentInventory = db.prepare('SELECT id FROM listing_inventory WHERE listingId = ?').all(id) as { id: string }[];
        const currentCount = currentInventory.length;
        const newCount = inventoryCount;

        if (newCount > currentCount) {
            // Add new inventory items
            const inventoryStmt = db.prepare('INSERT INTO listing_inventory (id, listingId, name) VALUES (?, ?, ?)');
            for (let i = currentCount; i < newCount; i++) {
                inventoryStmt.run(`inv-${randomUUID()}`, id, `${name} - Unit ${i + 1}`);
            }
        } else if (newCount < currentCount) {
            // Remove inventory items that are not booked
            const bookedInventoryIdsStmt = db.prepare(`
              SELECT DISTINCT je.value as inventoryId
              FROM bookings b, json_each(b.inventoryIds) je
              JOIN listing_inventory i ON i.id = je.value
              WHERE i.listingId = ? AND b.status != 'Cancelled'
            `);
            const bookedInventoryIdsResult = bookedInventoryIdsStmt.all(id) as {inventoryId: string}[];
            const bookedIds = new Set(bookedInventoryIdsResult.map(r => r.inventoryId));
            
            const deletableInventory = currentInventory.filter(i => !bookedIds.has(i.id));
            const countToDelete = currentCount - newCount;

            if (deletableInventory.length < countToDelete) {
                throw new Error(`Cannot reduce inventory to ${newCount}. Only ${deletableInventory.length} units are available for removal, but ${countToDelete} need to be removed. Please cancel active bookings first.`);
            }

            const idsToDelete = deletableInventory.slice(0, countToDelete).map(i => i.id);
            if (idsToDelete.length > 0) {
                const deleteStmt = db.prepare(`DELETE FROM listing_inventory WHERE id IN (${idsToDelete.map(() => '?').join(',')})`);
                deleteStmt.run(...idsToDelete);
            }
        }
    });

    transaction();

    revalidatePath('/dashboard?tab=listings', 'page');
    revalidatePath(`/listing/${id}`);
    revalidatePath('/bookings');
    
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
    
    const transaction = db.transaction(() => {
        // Check for active bookings associated with this listing's inventory
        const bookingCheckStmt = db.prepare(`
            SELECT COUNT(*) as bookingCount 
            FROM bookings b, json_each(b.inventoryIds) je
            JOIN listing_inventory i ON i.id = je.value
            WHERE i.listingId = ? AND b.status != 'Cancelled'
        `);
        const { bookingCount } = bookingCheckStmt.get(id) as { bookingCount: number };
        
        if (bookingCount > 0) {
            throw new Error(`This listing cannot be deleted because it has ${bookingCount} active or pending bookings.`);
        }

        // Delete associated inventory items
        const deleteInventoryStmt = db.prepare('DELETE FROM listing_inventory WHERE listingId = ?');
        deleteInventoryStmt.run(id);

        // Delete the main listing
        const deleteListingStmt = db.prepare('DELETE FROM listings WHERE id = ?');
        const info = deleteListingStmt.run(id);

        if (info.changes === 0) {
            throw new Error('Listing not found or could not be deleted.');
        }
    });
    
    transaction();

    revalidatePath('/dashboard?tab=listings', 'page');
    return { success: true, message: 'Listing and all its inventory have been deleted.' };
  } catch (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    const message = error instanceof Error ? error.message : "An unknown database error occurred.";
    return { success: false, message: `${message}` };
  }
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
  const session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }
  
  const { listingId, startDate, endDate, guests, numberOfUnits, guestEmail } = validatedFields.data;
  let userId: string;
  let isNewUser = false;

  if (session) {
    if (session.role === 'staff') {
      return { success: false, message: 'Staff accounts cannot create new bookings.' };
    }
    userId = session.id;
  } else if (guestEmail) {
    try {
        const db = await getDb();
        const existingUser = db.prepare('SELECT id, status FROM users WHERE email = ?').get(guestEmail) as User | undefined;
        if (existingUser) {
            userId = existingUser.id;
        } else {
            isNewUser = true;
            userId = `user-${randomUUID()}`;
            const hashedPassword = await hashPassword(randomUUID());
            const stmt = db.prepare('INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(userId, guestEmail.split('@')[0], guestEmail, hashedPassword, 'guest', 'provisional');
        }
    } catch (error) {
        console.error(`[CREATE_GUEST_USER_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to create guest user account: ${message}` };
    }
  } else {
    return { success: false, message: "You must be logged in or provide an email to book." };
  }

  try {
    const db = await getDb();

    const listing = await getListingById(listingId);
    if (!listing) {
        return { success: false, message: 'The venue you are trying to book does not exist.' };
    }

    if (guests > listing.maxGuests * numberOfUnits) {
      return { success: false, message: `The number of guests exceeds the capacity for ${numberOfUnits} unit(s).` };
    }

    const fromDate = new Date(startDate).toISOString().split('T')[0];
    const toDate = new Date(endDate).toISOString().split('T')[0];

    // Find ALL available inventory items for the given dates
    const findAvailableInventoryStmt = db.prepare(`
        SELECT id FROM listing_inventory
        WHERE listingId = ? 
        AND id NOT IN (
            SELECT je.value FROM bookings b, json_each(b.inventoryIds) je
            WHERE b.listingId = ?
            AND b.status = 'Confirmed'
            AND (b.endDate >= ? AND b.startDate <= ?)
        )
    `);

    const availableInventory = findAvailableInventoryStmt.all(listingId, listingId, fromDate, toDate) as { id: string }[];
    
    if (availableInventory.length < numberOfUnits) {
        return { success: false, message: `Sorry, only ${availableInventory.length} units are available for these dates. Please try another date range or reduce the number of units.` };
    }
    
    const inventoryToBook = availableInventory.slice(0, numberOfUnits);
    const inventoryIds = inventoryToBook.map(inv => inv.id);

    const stmt = db.prepare(`
      INSERT INTO bookings (id, listingId, userId, startDate, endDate, guests, status, listingName, createdAt, inventoryIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      `booking-${randomUUID()}`,
      listingId,
      userId,
      fromDate,
      toDate,
      guests,
      'Pending',
      listing.name,
      new Date().toISOString(),
      JSON.stringify(inventoryIds)
    );

    revalidatePath('/bookings');
    revalidatePath(`/listing/${listingId}`);

    let successMessage = `Your booking request for ${listing.name} is now pending confirmation.`;
    if (!session && guestEmail) {
      if (isNewUser) {
        successMessage += ` An account has been reserved for ${guestEmail}. Please go to the sign-up page to create a password and manage your bookings.`;
      } else {
        successMessage += ` This booking has been added to the account for ${guestEmail}. Please log in to manage your bookings.`;
      }
    }
    
    return { success: true, message: successMessage };
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
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
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

  const { bookingId, startDate, endDate, guests, numberOfUnits } = validatedFields.data;

  const fromDate = new Date(startDate).toISOString().split('T')[0];
  const toDate = new Date(endDate).toISOString().split('T')[0];

  try {
    const db = await getDb();
    const transaction = db.transaction(() => {
        const booking = db.prepare('SELECT userId, listingId FROM bookings WHERE id = ?').get(bookingId) as { userId: string, listingId: string } | undefined;

        if (!booking) {
          throw new Error('Booking not found.');
        }
    
        if (session.role !== 'admin' && booking.userId !== session.id) {
          throw new Error('You do not have permission to edit this booking.');
        }
        
        const listing = db.prepare('SELECT maxGuests FROM listings WHERE id = ?').get(booking.listingId) as { maxGuests: number } | undefined;
        if (listing && guests > (listing.maxGuests * numberOfUnits)) {
            throw new Error(`Number of guests cannot exceed the maximum capacity for ${numberOfUnits} units.`);
        }

        const findBookedUnitsStmt = db.prepare(`
            SELECT je.value as inventoryId
            FROM bookings b, json_each(b.inventoryIds) je
            WHERE b.listingId = ?
            AND b.status = 'Confirmed'
            AND b.id != ?
            AND (b.endDate >= ? AND b.startDate <= ?)
        `);
        const bookedUnitsResult = findBookedUnitsStmt.all(booking.listingId, bookingId, fromDate, toDate) as { inventoryId: string }[];
        const bookedUnitIds = new Set(bookedUnitsResult.map(r => r.inventoryId));
        
        const allInventoryForListing = db.prepare('SELECT id FROM listing_inventory WHERE listingId = ?').all(booking.listingId) as { id: string }[];
        
        const availableUnits = allInventoryForListing.filter(inv => !bookedUnitIds.has(inv.id));
        
        if (availableUnits.length < numberOfUnits) {
            throw new Error(`Cannot update booking. Only ${availableUnits.length} units are available for the selected dates, but ${numberOfUnits} were requested.`);
        }

        const newInventoryIds = availableUnits.slice(0, numberOfUnits).map(u => u.id);

        const modifiedAt = new Date();
        const statusMessage = `Modified by ${session.name} on ${modifiedAt.toLocaleDateString()}. Units: ${numberOfUnits}. Awaiting re-confirmation.`;

        const stmt = db.prepare(`
          UPDATE bookings 
          SET startDate = ?, endDate = ?, guests = ?, inventoryIds = ?, status = 'Pending', statusMessage = ?, actionByUserId = NULL, actionAt = NULL
          WHERE id = ?
        `);
        
        stmt.run(
            fromDate,
            toDate,
            guests,
            JSON.stringify(newInventoryIds),
            statusMessage,
            bookingId
        );
    });

    transaction();

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
  status: z.enum(['active', 'disabled', 'provisional']),
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
            // Update existing review and set status to pending for re-approval
            reviews[existingReviewIndex].rating = rating;
            reviews[existingReviewIndex].comment = comment;
            reviews[existingReviewIndex].status = 'pending';
        } else {
            // Add new review with pending status
            const newReview: Review = {
                id: `review-${randomUUID()}`,
                userId: session.id,
                author: session.name,
                avatar: `https://avatar.vercel.sh/${session.email}.png`,
                rating,
                comment,
                status: 'pending',
            };
            reviews.push(newReview);
        }

        // Recalculate average rating based on APPROVED reviews only
        const approvedReviews = reviews.filter(r => r.status === 'approved');
        const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
        const newAverageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;

        const stmt = db.prepare(`
            UPDATE listings
            SET reviews = ?, rating = ?
            WHERE id = ?
        `);
        
        stmt.run(JSON.stringify(reviews), newAverageRating, listingId);

        revalidatePath(`/listing/${listingId}`);
        return { success: true, message: 'Your review has been submitted and is awaiting approval.' };

    } catch (error) {
        console.error(`[ADD_REVIEW_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to submit review: ${message}` };
    }
}


const ReviewActionSchema = z.object({
  listingId: z.string(),
  reviewId: z.string(),
});

export async function approveReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    try {
        const db = await getDb();
        const listing = await getListingById(listingId);
        if (!listing) {
            return { success: false, message: 'Listing not found.' };
        }

        const reviews = listing.reviews;
        const reviewIndex = reviews.findIndex(r => r.id === reviewId);
        if (reviewIndex === -1) {
            return { success: false, message: 'Review not found.' };
        }

        reviews[reviewIndex].status = 'approved';

        const approvedReviews = reviews.filter(r => r.status === 'approved');
        const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
        const newAverageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;

        const stmt = db.prepare('UPDATE listings SET reviews = ?, rating = ? WHERE id = ?');
        stmt.run(JSON.stringify(reviews), newAverageRating, listingId);

        revalidatePath(`/listing/${listingId}`);
        return { success: true, message: 'Review approved successfully.' };
    } catch (error) {
        console.error(`[APPROVE_REVIEW_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to approve review: ${message}` };
    }
}


export async function deleteReviewAction(data: z.infer<typeof ReviewActionSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized action.' };
    }
    const { listingId, reviewId } = data;

    try {
        const db = await getDb();
        const listing = await getListingById(listingId);
        if (!listing) {
            return { success: false, message: 'Listing not found.' };
        }

        const updatedReviews = listing.reviews.filter(r => r.id !== reviewId);

        const approvedReviews = updatedReviews.filter(r => r.status === 'approved');
        const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
        const newAverageRating = approvedReviews.length > 0 ? totalRating / approvedReviews.length : 0;
        
        const stmt = db.prepare('UPDATE listings SET reviews = ?, rating = ? WHERE id = ?');
        stmt.run(JSON.stringify(updatedReviews), newAverageRating, listingId);

        revalidatePath(`/listing/${listingId}`);
        return { success: true, message: 'Review deleted successfully.' };
    } catch (error) {
        console.error(`[DELETE_REVIEW_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to delete review: ${message}` };
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

const MergeListingsSchema = z.object({
  primaryListingId: z.string(),
  listingIdsToMerge: z.array(z.string()).min(1, "At least one listing must be selected to merge."),
});

export async function mergeListingsAction(data: z.infer<typeof MergeListingsSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }
  
    const validatedFields = MergeListingsSchema.safeParse(data);
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
  
    const { primaryListingId, listingIdsToMerge } = validatedFields.data;
  
    try {
      const db = await getDb();
      const allListings = await getListingsByIds([primaryListingId, ...listingIdsToMerge]);
  
      const primaryListing = allListings.find(l => l.id === primaryListingId);
      const otherListings = allListings.filter(l => l.id !== primaryListingId);
  
      if (!primaryListing || otherListings.length === 0) {
        return { success: false, message: 'Could not find the listings to merge.' };
      }
  
      const transaction = db.transaction(() => {
        // 1. Combine unique images, features, and all reviews
        const mergedImages = [...new Set([...primaryListing.images, ...otherListings.flatMap(l => l.images)])];
        const mergedFeatures = [...new Set([...primaryListing.features, ...otherListings.flatMap(l => l.features)])];
        const mergedReviews = [...primaryListing.reviews, ...otherListings.flatMap(l => l.reviews)];
  
        // 2. Recalculate rating
        const totalRating = mergedReviews.reduce((sum, review) => sum + review.rating, 0);
        const newAverageRating = mergedReviews.length > 0 ? totalRating / mergedReviews.length : 0;
  
        // 3. Update the primary listing
        const updateListingStmt = db.prepare(`
          UPDATE listings
          SET images = ?, features = ?, reviews = ?, rating = ?
          WHERE id = ?
        `);
        updateListingStmt.run(
          JSON.stringify(mergedImages),
          JSON.stringify(mergedFeatures),
          JSON.stringify(mergedReviews),
          newAverageRating,
          primaryListingId
        );
  
        const idsToMergePlaceholders = listingIdsToMerge.map(() => '?').join(',');
        
        // 4. Re-assign inventory
        const updateInventoryStmt = db.prepare(`UPDATE listing_inventory SET listingId = ? WHERE listingId IN (${idsToMergePlaceholders})`);
        updateInventoryStmt.run(primaryListingId, ...listingIdsToMerge);
  
        // 5. Re-assign bookings
        const updateBookingsStmt = db.prepare(`UPDATE bookings SET listingId = ?, listingName = ? WHERE listingId IN (${idsToMergePlaceholders})`);
        updateBookingsStmt.run(primaryListingId, primaryListing.name, ...listingIdsToMerge);
  
        // 6. Delete the other listings
        const deleteListingsStmt = db.prepare(`DELETE FROM listings WHERE id IN (${idsToMergePlaceholders})`);
        deleteListingsStmt.run(...listingIdsToMerge);
      });
  
      transaction();
  
      revalidatePath('/dashboard');
      return { success: true, message: `${listingIdsToMerge.length} listing(s) were successfully merged into "${primaryListing.name}".` };
  
    } catch (error) {
      console.error(`[MERGE_LISTINGS_ACTION] Error: ${error}`);
      const message = error instanceof Error ? error.message : "An unknown database error occurred.";
      return { success: false, message: `Failed to merge listings: ${message}` };
    }
}

const BulkDeleteListingsSchema = z.object({
  listingIds: z.array(z.string()).min(1, "At least one listing must be selected for deletion."),
});

export async function bulkDeleteListingsAction(data: z.infer<typeof BulkDeleteListingsSchema>) {
    const session = await getSession();
    if (session?.role !== 'admin') {
        return { success: false, message: 'Unauthorized' };
    }

    const validatedFields = BulkDeleteListingsSchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data provided.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { listingIds } = validatedFields.data;

    try {
        const db = await getDb();
        const transaction = db.transaction(() => {
            const placeholders = listingIds.map(() => '?').join(',');

            // Check for active bookings across all listings to be deleted
            const bookingCheckStmt = db.prepare(`
                SELECT l.name, COUNT(b.id) as bookingCount 
                FROM listings l
                LEFT JOIN bookings b ON l.id = b.listingId AND b.status != 'Cancelled'
                WHERE l.id IN (${placeholders})
                GROUP BY l.id
            `);

            const bookingCounts = bookingCheckStmt.all(...listingIds) as { name: string, bookingCount: number }[];
            const listingsWithBookings = bookingCounts.filter(r => r.bookingCount > 0);
            
            if (listingsWithBookings.length > 0) {
                const names = listingsWithBookings.map(l => l.name).join(', ');
                throw new Error(`Cannot delete. The following listings have active bookings: ${names}`);
            }

            // Delete associated inventory items
            const deleteInventoryStmt = db.prepare(`DELETE FROM listing_inventory WHERE listingId IN (${placeholders})`);
            deleteInventoryStmt.run(...listingIds);

            // Delete the main listings
            const deleteListingsStmt = db.prepare(`DELETE FROM listings WHERE id IN (${placeholders})`);
            const info = deleteListingsStmt.run(...listingIds);

            if (info.changes < listingIds.length) {
                console.warn(`[BULK_DELETE_WARN] Expected to delete ${listingIds.length} listings, but only deleted ${info.changes}. Some might have been deleted already.`);
            }
        });

        transaction();

        revalidatePath('/dashboard');
        return { success: true, message: `${listingIds.length} listing(s) have been deleted.` };
    } catch (error) {
        console.error(`[BULK_DELETE_ACTION] Error: ${error}`);
        const message = error instanceof Error ? error.message : "An unknown database error occurred.";
        return { success: false, message: `Failed to delete listings: ${message}` };
    }
}
