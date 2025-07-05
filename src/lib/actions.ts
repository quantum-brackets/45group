'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from './db'

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

    revalidatePath('/dashboard');
    revalidatePath(`/listing/${id}`);
    
    return { success: true, message: `The details for "${name}" have been saved.` };
  } catch (error) {
    console.error("Database error:", error);
    return { success: false, message: "Failed to update listing in the database." };
  }
}
