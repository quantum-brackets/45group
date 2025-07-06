
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from './db'
import { randomUUID } from 'crypto'
import { getSession, deleteSession } from './session'
import { redirect } from 'next/navigation'

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
    console.error("Database error:", error);
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
    console.error("Database error:", error);
    return { success: false, message: "Failed to create booking in the database." };
  }
}

export async function logoutAction() {
    await deleteSession();
    redirect('/login');
}
