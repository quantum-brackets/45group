
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

const FormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(['hotel', 'events', 'restaurant']),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  priceUnit: z.enum(['night', 'hour', 'person']),
  maxGuests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
});

export async function updateListingAction(id: string, data: z.infer<typeof FormSchema>) {
  const session = await getSession();
  if (session?.role !== 'admin') {
    return { success: false, message: 'Unauthorized' };
  }
  
  const validatedFields = FormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }
  
  const { name, type, location, description, price, priceUnit, maxGuests, features } = validatedFields.data;
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
        features = ?
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
      INSERT INTO bookings (id, listingId, userId, listingName, startDate, endDate, guests, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      randomUUID(),
      listingId,
      session.id,
      listingName,
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
          sameSite: 'none',
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
