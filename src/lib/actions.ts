/**
 * @fileoverview This file contains all the "Server Actions" for the application.
 * Server Actions are asynchronous functions that are only executed on the server.
 * They can be called directly from client components (forms, button clicks, etc.),
 * which eliminates the need to create separate API endpoints for data mutations.
 *
 * Each action typically performs the following steps:
 * 1. Checks user session and permissions.
 * 2. Validates incoming data using Zod schemas.
 * 3. Interacts with the database (Supabase) to perform CRUD operations.
 * 4. Uses `revalidatePath` or `revalidateTag` to update the Next.js cache and refresh the UI.
 * 5. Returns a structured response, usually `{ success: boolean, message: string }`.
 *
 * Using server actions centralizes business logic, improves security by keeping sensitive
 * operations on the server, and simplifies the overall architecture.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, logout as sessionLogout } from "@/lib/session";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { hashPassword } from "@/lib/password";
import {
  type Booking,
  type Listing,
  type Role,
  type Review,
  type User,
  type BookingAction,
  type Bill,
  type Payment,
  type Permission,
  LISTING_TYPES,
  ListingTypes,
} from "@/lib/types";
import { randomUUID } from "crypto";
import {
  sendBookingConfirmationEmail,
  sendBookingRequestEmail,
  sendBookingSummaryEmail,
  sendReportEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import { preloadPermissions } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions";
import {
  generateRandomString,
  calculateBookingFinancials,
  differenceInDays,
  daysInterval,
  areNamesSimilar,
  subDays,
  parseDate,
} from "@/lib/utils";
import { getAllBookings, getBookingsByDateRange } from "./data";
import { EVENT_BOOKING_DAILY_HRS, MAX_DISCOUNT_PERCENT } from "./constants";

/**
 * Finds the most similar existing user based on name.
 * @param supabase - The Supabase admin client.
 * @param name - The name to search for.
 * @returns A User object if a similar user is found, otherwise null.
 */
async function findSimilarUser(
  supabase: any,
  name: string
): Promise<User | null> {
  const { data: allUsers, error } = await supabase
    .from("users")
    .select("id, data, email, role, status");
  if (error) {
    console.error("Error fetching users for similarity check:", error);
    return null;
  }

  for (const user of allUsers.map(unpackUser)) {
    if (user.name && areNamesSimilar(name, user.name)) {
      return user; // Return the first match found
    }
  }

  return null;
}

function unpackUser(user: any): User {
  if (!user) return null as any;
  const { data, ...rest } = user;
  return { ...rest, ...data };
}

function unpackListing(listing: any): Listing {
  if (!listing) return null as any;
  const { data, listing_inventory, ...rest } = listing;
  // The count is returned as an object in an array, e.g., [{ count: 5 }]
  const inventoryCount = listing_inventory
    ? Array.isArray(listing_inventory)
      ? listing_inventory[0]?.count
      : 0
    : 0;
  return { ...rest, ...data, inventoryCount };
}

function unpackBooking(dbBooking: any): Booking {
  if (!dbBooking) return null as any;
  const { data, listing_id, user_id, start_date, end_date, ...rest } =
    dbBooking;

  // For backwards compatibility, derive `createdAt` from the actions array if not present.
  // New bookings will have `data.createdAt` directly.
  const createdAt =
    data?.createdAt ||
    (data?.actions && data.actions.length > 0
      ? data.actions.find((a: BookingAction) => a.action === "Created")
          ?.timestamp
      : new Date(0).toISOString()); // Fallback for very old data with no actions

  return {
    ...rest,
    ...data,
    listingId: listing_id,
    userId: user_id,
    startDate: start_date,
    endDate: end_date,
    createdAt: createdAt,
  };
}

/**
 * Updates the permissions for all roles in the system.
 * This is an admin-only action.
 * @param permissions - An object where keys are roles and values are arrays of permission strings.
 * @returns A result object indicating success or failure.
 */
export async function updatePermissionsAction(
  permissions: Record<Role, Permission[]>
) {
  const perms = await preloadPermissions();
  const session = await getSession();
  // Security: Ensure the user has permission to update permissions.
  if (!session || !hasPermission(perms, session, "permissions:update")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to update roles and permissions.",
    };
  }

  const supabase = createSupabaseAdminClient();

  // Prepare the data for a bulk `upsert` operation.
  const updates = Object.entries(permissions).map(([role, perms]) => ({
    role: role,
    data: { permissions: perms },
  }));

  // Upsert atomically updates existing roles or inserts new ones.
  const { error } = await supabase
    .from("role_permissions")
    .upsert(updates, { onConflict: "role" });

  if (error) {
    console.error("Error saving permissions:", error);
    return {
      success: false,
      message: `Database Error: Failed to save permissions. ${error.message}`,
    };
  }

  // Invalidate the cache for the permissions page to show the new data.
  revalidatePath("/dashboard/permissions");
  return { success: true, message: "Permissions updated successfully." };
}

// Zod schema for validating data from the listing creation/update form.
// This ensures data integrity before it reaches the database.
const ListingFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(LISTING_TYPES, { required_error: "Type is required." }),
  location: z.string().min(1, "Location is required."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  price_unit: z.enum(["night", "hour", "person"], {
    required_error: "Price unit is required.",
  }),
  currency: z.enum(["USD", "EUR", "GBP", "NGN"], {
    required_error: "Currency is required.",
  }),
  max_guests: z.coerce
    .number()
    .int()
    .min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
  images: z
    .array(z.string().url({ message: "Please enter a valid image URL." }))
    .min(1, "At least one image is required."),
  // Inventory is an array of objects, allowing for dynamic addition/removal of units.
  inventory: z
    .array(
      z.object({
        id: z.string().optional(), // `id` is present when updating an existing unit.
        name: z.string().min(1, "Unit name cannot be empty."),
      })
    )
    .min(0, "There must be at least 0 units."),
});

/**
 * Creates a new listing and its associated inventory units.
 * @param data - The listing data, validated against ListingFormSchema.
 * @returns A result object indicating success or failure.
 */
export async function createListingAction(
  data: z.infer<typeof ListingFormSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  // Security: Check permissions.
  if (!session || !hasPermission(perms, session, "listing:create")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to create new listings.",
    };
  }

  const validatedFields = ListingFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    type,
    location,
    description,
    price,
    price_unit,
    currency,
    max_guests,
    features,
    images,
    inventory,
  } = validatedFields.data;

  // Data is stored in a JSONB column for flexibility.
  const listingJsonData = {
    name,
    description,
    price,
    price_unit,
    currency,
    max_guests,
    features: features.split(",").map((f) => f.trim()), // Convert comma-separated string to array
    images,
    rating: 0, // Initialize rating
    reviews: [], // Initialize reviews
  };

  // Insert the main listing record.
  const { data: newListing, error: listingError } = await supabase
    .from("listings")
    .insert({
      type,
      location,
      data: listingJsonData,
    })
    .select("id")
    .single();

  if (listingError || !newListing) {
    console.error(
      "[CREATE_LISTING_ACTION] Error creating listing:",
      listingError
    );
    return {
      success: false,
      message: `Database Error: Failed to create listing. ${listingError?.message}`,
    };
  }

  // If inventory units were provided, insert them into the inventory table.
  if (inventory.length > 0) {
    const inventoryItems = inventory.map((item) => ({
      listing_id: newListing.id,
      name: item.name,
    }));
    const { error: inventoryError } = await supabase
      .from("listing_inventory")
      .insert(inventoryItems);
    if (inventoryError) {
      console.error(
        "[CREATE_LISTING_ACTION] Error creating inventory:",
        inventoryError
      );
      // Rollback: If inventory fails, delete the listing to prevent partial data.
      await supabase.from("listings").delete().eq("id", newListing.id);
      return {
        success: false,
        message: `Database Error: Failed to create inventory. ${inventoryError.message}`,
      };
    }
  }

  // Revalidate the dashboard path to show the new listing.
  revalidatePath("/dashboard?tab=listings", "page");
  return {
    success: true,
    message: `Listing "${name}" has been created with ${inventory.length} units.`,
  };
}

/**
 * Updates an existing listing and reconciles its inventory.
 * @param id - The ID of the listing to update.
 * @param data - The updated listing data.
 * @returns A result object indicating success or failure.
 */
export async function updateListingAction(
  id: string,
  data: z.infer<typeof ListingFormSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "listing:update")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to update listings.",
    };
  }

  const validatedFields = ListingFormSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Fetch the existing listing to preserve fields not in the form (like reviews and rating).
  const { data: existingListing, error: fetchError } = await supabase
    .from("listings")
    .select("data")
    .eq("id", id)
    .single();

  if (fetchError || !existingListing) {
    return {
      success: false,
      message: "Database Error: Could not find the listing to update.",
    };
  }

  const {
    name,
    type,
    location,
    description,
    price,
    price_unit,
    currency,
    max_guests,
    features,
    images,
    inventory: formInventory,
  } = validatedFields.data;

  // Merge new form data with existing data to prevent overwriting reviews/ratings.
  const listingJsonData = {
    ...existingListing.data,
    name,
    description,
    price,
    price_unit,
    currency,
    max_guests,
    features: features.split(",").map((f) => f.trim()),
    images,
  };

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      type,
      location,
      data: listingJsonData,
    })
    .eq("id", id);

  if (updateError) {
    console.error(
      `[UPDATE_LISTING_ACTION] Error updating listing: ${updateError.message}`
    );
    return {
      success: false,
      message: `Database Error: Failed to update listing. ${updateError.message}`,
    };
  }

  // --- Smart Inventory Reconciliation Logic ---
  // This logic determines which inventory items need to be created, updated, or deleted.
  const { data: dbInventory } = await supabase
    .from("listing_inventory")
    .select("id, name")
    .eq("listing_id", id);
  const dbInventoryMap = new Map(
    (dbInventory || []).map((i) => [i.id, i.name])
  );
  const formInventoryMap = new Map(
    formInventory.filter((i) => i.id).map((i) => [i.id!, i.name])
  );

  // Find what to create, update, or delete by comparing the form state to the DB state.
  const itemsToCreate = formInventory.filter((i) => !i.id);
  const itemsToUpdate = formInventory.filter(
    (i) =>
      i.id && dbInventoryMap.has(i.id) && dbInventoryMap.get(i.id) !== i.name
  );
  const idsToDelete = (dbInventory || [])
    .filter((i) => !formInventoryMap.has(i.id))
    .map((i) => i.id);

  // Safety check: Prevent deletion of inventory units tied to active bookings.
  if (idsToDelete.length > 0) {
    const { data: bookedInv, error: bookedError } = await supabase
      .from("bookings")
      .select("data")
      .eq("listing_id", id)
      .in("status", ["Pending", "Confirmed"]);
    if (bookedError)
      return {
        success: false,
        message: `Database Error: Failed to check for active bookings. ${bookedError.message}`,
      };

    const bookedIds = new Set(
      bookedInv.flatMap((b) => b.data.inventoryIds || [])
    );
    const isBookedItemDeleted = idsToDelete.some((id) => bookedIds.has(id));

    if (isBookedItemDeleted) {
      return {
        success: false,
        message:
          "Update Failed: Cannot delete inventory units that are part of an active or pending booking.",
      };
    }
  }

  // Batch all database operations to run in parallel.
  const operations = [];
  if (itemsToCreate.length > 0) {
    operations.push(
      supabase
        .from("listing_inventory")
        .insert(itemsToCreate.map((i) => ({ listing_id: id, name: i.name })))
    );
  }
  if (itemsToUpdate.length > 0) {
    itemsToUpdate.forEach((item) => {
      operations.push(
        supabase
          .from("listing_inventory")
          .update({ name: item.name })
          .eq("id", item.id!)
      );
    });
  }
  if (idsToDelete.length > 0) {
    operations.push(
      supabase.from("listing_inventory").delete().in("id", idsToDelete)
    );
  }

  const results = await Promise.all(operations);
  const firstError = results.find((r) => r.error);

  if (firstError?.error) {
    console.error(
      "[UPDATE_LISTING_ACTION] Inventory update error:",
      firstError.error
    );
    return {
      success: false,
      message: `Database Error: Failed to update inventory. ${firstError.error.message}`,
    };
  }

  // Revalidate all relevant paths.
  revalidatePath("/dashboard?tab=listings", "page");
  revalidatePath(`/listing/${id}`);
  revalidatePath("/bookings");

  return {
    success: true,
    message: `The details for "${name}" have been saved.`,
  };
}

/**
 * Deletes a listing and its associated inventory.
 * @param id - The ID of the listing to delete.
 * @returns A result object indicating success or failure.
 */
export async function deleteListingAction(id: string) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "listing:delete")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to delete listings.",
    };
  }

  // Safety check: Prevent deletion if there are active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from("bookings")
    .select("id")
    .eq("listing_id", id)
    .in("status", ["Pending", "Confirmed"])
    .limit(1);

  if (bookingCheckError) {
    return {
      success: false,
      message: `Database Error: Failed to check for active bookings. ${bookingCheckError.message}`,
    };
  }
  if (activeBookings && activeBookings.length > 0) {
    return {
      success: false,
      message:
        "Deletion Failed: Cannot delete a listing with active or pending bookings. Please cancel them first.",
    };
  }

  // The database is set up with cascading deletes, so deleting the listing
  // will also delete its inventory units.
  const { error } = await supabase.from("listings").delete().eq("id", id);

  if (error) {
    console.error(`[DELETE_LISTING_ACTION] Error: ${error}`);
    return {
      success: false,
      message: `Database Error: Failed to delete listing. ${error.message}`,
    };
  }

  revalidatePath("/dashboard?tab=listings", "page");
  return {
    success: true,
    message: "Listing and all its inventory have been deleted.",
  };
}

// Zod schema for creating bookings.
const CreateBookingSchema = z
  .object({
    listingId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    guests: z.coerce.number().int().min(1, "At least one guest is required."),
    numberOfUnits: z.coerce
      .number()
      .int()
      .min(1, "At least one unit is required."),
    userId: z.string().optional(),
    guestName: z.string().optional(),
    guestEmail: z.string().optional().or(z.literal("")),
    guestNotes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // This is a guest checkout (or new user booking by staff).
    // We only need a name. Email is optional.
    if (!data.userId && !data.guestName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest name is required for new guests.",
        path: ["guestName"],
      });
    }
  });

/**
 * Helper function to find available inventory units for a given listing and date range.
 * @param supabase - The Supabase client instance.
 * @param listingId - The ID of the listing.
 * @param startDate - The start date of the desired booking.
 * @param endDate - The end date of the desired booking.
 * @param excludeBookingId - An optional booking ID to exclude from the check (used when updating a booking).
 * @returns An array of available inventory IDs.
 */
async function findAvailableInventory(
  supabase: any,
  listingId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<string[]> {
  // Get all inventory units for the listing.
  const { data: allInventory, error: invError } = await supabase
    .from("listing_inventory")
    .select("id")
    .eq("listing_id", listingId);

  if (invError) throw new Error("Database Error: Could not fetch inventory.");

  const allInventoryIds = allInventory.map((inv: any) => inv.id);

  // Find all confirmed bookings that overlap with the requested date range.
  let bookingsQuery = supabase
    .from("bookings")
    .select("data")
    .eq("listing_id", listingId)
    .eq("status", "Confirmed") // Only `Confirmed` bookings block availability.
    .lte("start_date", endDate) // A booking that starts before or on the day the new one ends.
    .gte("end_date", startDate); // A booking that ends after or on the day the new one starts.

  // If we are updating a booking, we need to exclude it from the check.
  if (excludeBookingId) {
    bookingsQuery = bookingsQuery.neq("id", excludeBookingId);
  }

  const { data: overlappingBookings, error: bookingsError } =
    await bookingsQuery;

  if (bookingsError)
    throw new Error(
      "Database Error: Could not check for overlapping bookings."
    );

  // Get a set of all inventory IDs that are booked during the overlapping period.
  const bookedInventoryIds = new Set(
    overlappingBookings.flatMap((b: any) => b.data.inventoryIds || [])
  );

  // Return the list of inventory IDs that are not booked.
  return allInventoryIds.filter((id: string) => !bookedInventoryIds.has(id));
}

type FindOrCreateResult = {
  userId: string;
  userName: string;
  userEmail?: string;
  isNewUser: boolean;
  error?: string;
};

/**
 * Finds an existing user or creates a new provisional one.
 * This centralized function is used by both the booking and user creation flows.
 * @param supabase - The Supabase admin client.
 * @param name - The name of the guest.
 * @param email - The optional email of the guest.
 * @param notes - Optional notes to add to the new user's profile.
 * @returns A result object with user details or an error message.
 */
async function findOrCreateGuestUser(
  supabase: any,
  name: string,
  email?: string | null,
  notes?: string | null
): Promise<FindOrCreateResult> {
  // First, check for a similar name match.
  const similarUser = await findSimilarUser(supabase, name);
  if (similarUser) {
    return {
      userId: similarUser.id,
      userName: similarUser.name,
      userEmail: similarUser.email,
      isNewUser: false,
    };
  }

  // If no similar name, check for an exact email match.
  if (email) {
    const lowerCaseEmail = email.toLowerCase();
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, status, data")
      .eq("email", lowerCaseEmail)
      .single();

    if (existingUser) {
      if (existingUser.status === "active") {
        return {
          error:
            "An active account with this email already exists. Please use a different email or log in.",
          isNewUser: false,
          userId: "",
          userName: "",
        };
      }
      return {
        userId: existingUser.id,
        userName: existingUser.data.name || name,
        userEmail: lowerCaseEmail,
        isNewUser: false,
      };
    }
  }

  // If no similar user and no email match, create a new one.
  const placeholderEmail = email
    ? email.toLowerCase()
    : `walk-in-booking-${generateRandomString(6)}@45group.org`;
  const dataPayload: { name: string; notes?: string } = { name };
  if (notes) {
    dataPayload.notes = notes;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      email: placeholderEmail,
      role: "guest",
      status: "provisional",
      data: dataPayload,
    })
    .select("id")
    .single();

  if (insertError || !newUser) {
    console.error("Error creating provisional user:", insertError);
    return {
      error: "Database Error: Could not create a provisional guest account.",
      isNewUser: false,
      userId: "",
      userName: "",
    };
  }

  return {
    userId: newUser.id,
    userName: name,
    userEmail: email ? email.toLowerCase() : undefined,
    isNewUser: true,
  };
}

/**
 * Creates a new booking. Handles logged-in users, admins booking for guests, and new guest checkouts.
 * @param data - The booking data.
 * @returns A result object indicating success or failure.
 */
export async function createBookingAction(
  data: z.infer<typeof CreateBookingSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  const validatedFields = CreateBookingSchema.safeParse(data);
  if (!validatedFields.success) {
    const errorMessages = Object.values(
      validatedFields.error.flatten().fieldErrors
    )
      .map((e) => e?.[0])
      .filter(Boolean)
      .join(", ");
    return {
      success: false,
      message: `Validation Error: ${
        errorMessages || "Please check your input."
      }`,
    };
  }

  const {
    listingId,
    startDate,
    endDate,
    guests,
    numberOfUnits,
    userId,
    guestName,
    guestNotes,
  } = validatedFields.data;
  const guestEmail = validatedFields.data.guestEmail
    ? validatedFields.data.guestEmail.toLowerCase()
    : undefined;

  let finalUserId: string;
  let finalUserName: string;
  let finalUserEmail: string | undefined;
  let isNewUser = false;
  let actorId: string;
  let actorName: string;

  if (session) {
    actorId = session.id;
    actorName = session.name;

    // Case 1: Logged-in user booking for someone else.
    if (guestName) {
      if (!hasPermission(perms, session, "booking:create"))
        return { success: false, message: "Permission Denied" };

      const result = await findOrCreateGuestUser(
        supabase,
        guestName,
        guestEmail,
        guestNotes
      );

      if (result.error) return { success: false, message: result.error };
      finalUserId = result.userId;
      finalUserName = result.userName;
      finalUserEmail = result.userEmail;
      isNewUser = result.isNewUser;
      // Case 2: User booking for themselves.
    } else {
      if (
        !hasPermission(perms, session, "booking:create:own", {
          ownerId: session.id,
        })
      )
        return { success: false, message: "Permission Denied" };
      finalUserId = session.id;
      finalUserName = session.name;
      finalUserEmail = session.email;
    }
  } else {
    // Case 3: Unauthenticated guest checkout.
    if (!guestName || !guestEmail)
      return {
        success: false,
        message:
          "Validation Error: Guest name and email are required for guest checkout.",
      };
    actorName = guestName;
    const result = await findOrCreateGuestUser(
      supabase,
      guestName,
      guestEmail,
      guestNotes
    );
    if (result.error) return { success: false, message: result.error };
    finalUserId = result.userId;
    finalUserName = result.userName;
    finalUserEmail = result.userEmail;
    isNewUser = result.isNewUser;
    actorId = finalUserId; // For guest checkout, the guest is the actor.
  }

  try {
    const availableInventory = await findAvailableInventory(
      supabase,
      listingId,
      startDate,
      endDate
    );
    if (availableInventory.length < numberOfUnits) {
      return {
        success: false,
        message: `Booking Failed: Not enough units available for the selected dates. Only ${availableInventory.length} left.`,
      };
    }
    const inventoryToBook = availableInventory.slice(0, numberOfUnits);

    const { data: listingDataForMessage } = await supabase
      .from("listings")
      .select("data")
      .eq("id", listingId)
      .single();
    const listingForMessage = unpackListing({
      ...listingDataForMessage,
      id: listingId,
    });

    const createdAt = new Date().toISOString();
    const isBookingForOther = session && session.id !== finalUserId;

    let message;
    const rateInfo = `Rate: ${listingForMessage.price} ${listingForMessage.currency}/${listingForMessage.price_unit}.`;

    if (hasPermission(perms, session, "booking:create") && isBookingForOther) {
      message = `Booking created by staff member ${actorName} on behalf of ${finalUserName}. ${rateInfo}`;
    } else {
      message = `Booking request received. ${rateInfo}`;
    }

    const initialAction: BookingAction = {
      timestamp: createdAt,
      actorId: actorId,
      actorName: actorName,
      action: "Created",
      message: message,
    };

    const bookingData = {
      guests,
      bookingName: finalUserName,
      inventoryIds: inventoryToBook,
      actions: [initialAction],
      createdAt: createdAt,
      bills: [],
      payments: [],
      discount: 0,
    };

    const { data: newBooking, error: createBookingError } = await supabase
      .from("bookings")
      .insert({
        listing_id: listingId,
        user_id: finalUserId,
        start_date: startDate,
        end_date: endDate,
        status: "Pending",
        data: bookingData,
      })
      .select()
      .single();

    if (createBookingError || !newBooking) throw createBookingError;

    const userForEmail = {
      name: finalUserName,
      email: finalUserEmail,
      id: finalUserId,
    };

    if (finalUserEmail && !finalUserEmail.includes("@45group.org")) {
      if (isNewUser) {
        await sendWelcomeEmail({
          name: userForEmail.name,
          email: userForEmail.email!,
        });
      }
      const { data: listingData } = await supabase
        .from("listings")
        .select("data")
        .eq("id", listingId)
        .single();
      if (listingData) {
        const tempFullUser: User = {
          ...userForEmail,
          role: "guest",
          status: "provisional",
          name: userForEmail.name,
          email: userForEmail.email!,
        };
        await sendBookingRequestEmail(
          tempFullUser,
          unpackBooking(newBooking),
          unpackListing({ ...listingData, id: listingId })
        );
      }
    }

    revalidatePath("/bookings");
    revalidatePath(`/listing/${listingId}`);

    const baseReturn = {
      success: true,
      message:
        "Your booking request has been sent and is pending confirmation.",
      bookingId: newBooking.id,
    };

    if (session) {
      return baseReturn;
    } else {
      return {
        ...baseReturn,
        message:
          "Your booking request has been sent! Check your email to complete your account setup.",
      };
    }
  } catch (e: any) {
    return { success: false, message: `Booking Failed: ${e.message}` };
  }
}

// Zod schema for validating booking update data.
const UpdateBookingSchema = z.object({
  bookingId: z.string(),
  bookingName: z.string().min(1, "Booking name is required."),
  startDate: z.string(),
  endDate: z.string(),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce
    .number()
    .int()
    .min(1, "At least one unit is required."),
  userId: z.string().optional(),
  inventoryIds: z.array(z.string()).optional(),
});

/**
 * Updates an existing booking.
 * @param data - The updated booking data.
 * @returns A result object indicating success or failure.
 */
export async function updateBookingAction(
  data: z.infer<typeof UpdateBookingSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session)
    return {
      success: false,
      message:
        "Authentication Error: You must be logged in to perform this action.",
    };

  const validatedFields = UpdateBookingSchema.safeParse(data);
  if (!validatedFields.success)
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };

  const {
    bookingId,
    startDate,
    endDate,
    guests,
    numberOfUnits,
    bookingName,
    userId,
    inventoryIds,
  } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("user_id, listing_id, data, status, start_date, end_date")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking)
    return {
      success: false,
      message: "Database Error: Could not find the booking to update.",
    };

  const canUpdate =
    hasPermission(perms, session, "booking:update:own", {
      ownerId: booking.user_id,
    }) || hasPermission(perms, session, "booking:update");
  const canReassignUnits = session.role === "admin" || session.role === "staff";

  if (!canUpdate) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to update this booking.",
    };
  }

  const ownerChanged = userId && userId !== booking.user_id;

  if (ownerChanged && !hasPermission(perms, session, "booking:update")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to change the owner of a booking.",
    };
  }

  // Determine if critical fields have changed, which may require re-confirmation.
  const existingStartDate = booking.start_date;
  const existingEndDate = booking.end_date;
  const existingNumberOfUnits = (booking.data.inventoryIds || []).length;
  const existingInventoryIds = new Set<string>(booking.data.inventoryIds || []);
  const newInventoryIds = new Set<string>(inventoryIds || []);
  const unitsChanged = inventoryIds
    ? !(
        existingInventoryIds.size === newInventoryIds.size &&
        [...existingInventoryIds].every((id) => newInventoryIds.has(id))
      )
    : numberOfUnits !== existingNumberOfUnits;

  const datesChanged =
    startDate !== existingStartDate || endDate !== existingEndDate;

  let newStatus = booking.status;
  let successMessage: string;
  const actions: BookingAction[] = [...(booking.data.actions || [])];

  // If a confirmed booking is changed, it must be re-confirmed.
  if (booking.status === "Confirmed" && (datesChanged || unitsChanged)) {
    newStatus = "Pending";
    successMessage =
      "Booking has been updated and is now pending re-confirmation.";
    actions.push({
      timestamp: new Date().toISOString(),
      actorId: session.id,
      actorName: session.name,
      action: "Updated",
      message:
        "Booking updated. Awaiting re-confirmation due to date/unit changes.",
    });
  } else {
    successMessage = "Booking has been updated successfully.";
    actions.push({
      timestamp: new Date().toISOString(),
      actorId: session.id,
      actorName: session.name,
      action: "Updated",
      message: "Booking details updated.",
    });
  }

  if (ownerChanged) {
    const { data: newUser } = (await supabase
      .from("users")
      .select("data->>name as name")
      .eq("id", userId!)
      .single()) as { data: User };
    if (!newUser || !newUser.name) {
      return {
        success: false,
        message:
          "Database Error: The selected new owner does not exist or has no name.",
      };
    }
    actions.push({
      timestamp: new Date().toISOString(),
      actorId: session.id,
      actorName: session.name,
      action: "Updated",
      message: `Booking owner changed to ${newUser.name}.`,
    });
  }

  try {
    let inventoryToBook = booking.data.inventoryIds;
    // If units were changed (either by number or by selection), we need to validate them.
    if (datesChanged || unitsChanged) {
      // Re-check inventory availability for the new dates, excluding the current booking.
      const availableInventory = await findAvailableInventory(
        supabase,
        booking.listing_id,
        startDate,
        endDate,
        bookingId
      );
      const availableInventorySet = new Set(availableInventory);

      if (canReassignUnits && inventoryIds) {
        if (inventoryIds.length !== numberOfUnits)
          return {
            success: false,
            message: `Update Failed: You must select exactly ${numberOfUnits} unit(s).`,
          };
        const allSelectedAreAvailable = inventoryIds.every(
          (id) => availableInventorySet.has(id) || existingInventoryIds.has(id)
        );
        if (!allSelectedAreAvailable) {
          return {
            success: false,
            message: `Update Failed: One or more selected units are not available for the new dates.`,
          };
        }
        inventoryToBook = inventoryIds;
      } else {
        if (availableInventory.length < numberOfUnits) {
          return {
            success: false,
            message: `Update Failed: Not enough units available for the new dates. Only ${availableInventory.length} left.`,
          };
        }
        inventoryToBook = availableInventory.slice(0, numberOfUnits);
      }
    }

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

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (error) throw error;

    revalidatePath("/bookings");
    revalidatePath(`/booking/${bookingId}`);
    return { success: true, message: successMessage };
  } catch (e: any) {
    return { success: false, message: `Update Failed: ${e.message}` };
  }
}

/**
 * Logs the user out by destroying their session cookie.
 * @param from - The path to redirect to after logout.
 */
export async function logoutAction(from: string) {
  await sessionLogout();
  redirect(from);
}

// Simple schema for actions that only need a booking ID.
const BookingActionSchema = z.object({
  bookingId: z.string(),
});

/**
 * Cancels a booking.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function cancelBookingAction(
  data: z.infer<typeof BookingActionSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session)
    return {
      success: false,
      message:
        "Authentication Error: You must be logged in to perform this action.",
    };

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("user_id, listing_id, data")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking)
    return {
      success: false,
      message: "Database Error: Could not find the booking to cancel.",
    };

  if (
    !hasPermission(perms, session, "booking:cancel:own", {
      ownerId: booking.user_id,
    }) &&
    !hasPermission(perms, session, "booking:cancel")
  ) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to cancel this booking.",
    };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("data")
    .eq("id", booking.listing_id)
    .single();

  // Add a "Cancelled" action to the booking's history.
  const cancelAction: BookingAction = {
    timestamp: new Date().toISOString(),
    actorId: session.id,
    actorName: session.name,
    action: "Cancelled",
    message: `Booking cancelled by ${session.name}.`,
  };

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled",
      data: {
        ...booking.data,
        actions: [...(booking.data.actions || []), cancelAction],
      },
    })
    .eq("id", bookingId);

  if (error)
    return {
      success: false,
      message: `Database Error: Failed to cancel booking. ${error.message}`,
    };

  revalidatePath("/bookings");
  revalidatePath(`/booking/${bookingId}`);

  return {
    success: true,
    message: `Booking for ${
      listing?.data.name || "listing"
    } has been cancelled.`,
  };
}

/**
 * Calculates the total bill and payment balance for a booking.
 * @param booking - The booking object.
 * @param listing - The associated listing object.
 * @returns An object with `totalBill`, `totalPayments`, and `balance`.
 */
function calculateBookingBalance(booking: Booking, listing: Listing) {
  const units = (booking.inventoryIds || []).length;
  const guests = booking.guests;

  const durationDays = differenceInDays(booking.endDate, booking.startDate);
  const nights = durationDays > 0 ? durationDays : 1;

  let baseBookingCost = 0;
  switch (listing.price_unit) {
    case "night":
      baseBookingCost = listing.price * nights * units;
      break;
    case "hour":
      baseBookingCost =
        listing.price * durationDays * EVENT_BOOKING_DAILY_HRS * units;
      break;
    case "person":
      baseBookingCost = listing.price * guests * units;
      break;
  }

  const discountAmount = (baseBookingCost * (booking.discount || 0)) / 100;
  const addedBillsTotal = (booking.bills || []).reduce(
    (sum, bill) => sum + bill.amount,
    0
  );
  const totalBill = baseBookingCost + addedBillsTotal;
  const totalPayments =
    (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) +
    discountAmount;
  const balance = totalBill - totalPayments;

  return { totalBill, totalPayments, balance };
}

/**
 * Confirms a pending booking.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function confirmBookingAction(
  data: z.infer<typeof BookingActionSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "booking:confirm")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to confirm bookings.",
    };
  }

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking)
    return {
      success: false,
      message: "Database Error: Could not find the booking to confirm.",
    };

  const unpackedBooking = unpackBooking(booking);

  // Fetch listing to calculate bill
  const { data: listingData } = await supabase
    .from("listings")
    .select("id, data")
    .eq("id", unpackedBooking.listingId)
    .single();
  if (!listingData)
    return {
      success: false,
      message: "Database Error: Could not find the associated listing.",
    };
  const unpackedListing = unpackListing(listingData);

  // Check payment status for staff AND ADMINS
  if (session.role === "staff" || session.role === "admin") {
    const { totalPayments } = calculateBookingBalance(
      unpackedBooking,
      unpackedListing
    );

    let depositRequired = 0;
    const units = (unpackedBooking.inventoryIds || []).length;

    switch (unpackedListing.price_unit) {
      case "night":
        depositRequired = unpackedListing.price * 1 * units; // 1 night
        break;
      case "hour":
        depositRequired = unpackedListing.price * 1 * units; // 1 hour
        break;
      case "person":
        depositRequired = unpackedListing.price * 1 * units; // 1 person
        break;
    }

    if (totalPayments < depositRequired) {
      return {
        success: false,
        message: `Action Blocked: A deposit of at least ${new Intl.NumberFormat(
          "en-US",
          { style: "currency", currency: unpackedListing.currency || "USD" }
        ).format(depositRequired)} is required to confirm.`,
      };
    }
  }

  try {
    // Final availability check at the moment of confirmation to prevent race conditions.
    const availableInventory = await findAvailableInventory(
      supabase,
      booking.listing_id,
      booking.start_date,
      booking.end_date,
      bookingId
    );

    const currentlyHeldIds = new Set(booking.data.inventoryIds || []);
    const stillAvailable = availableInventory.filter((id) =>
      currentlyHeldIds.has(id)
    );

    // If the units assigned to this pending booking are no longer available, cancel it.
    if (stillAvailable.length < (booking.data.inventoryIds || []).length) {
      const systemCancelAction: BookingAction = {
        timestamp: new Date().toISOString(),
        actorId: "system",
        actorName: "System",
        action: "System",
        message:
          "Booking automatically cancelled due to inventory conflict during confirmation.",
      };

      await supabase
        .from("bookings")
        .update({
          status: "Cancelled",
          data: {
            ...booking.data,
            actions: [...(booking.data.actions || []), systemCancelAction],
          },
        })
        .eq("id", bookingId);
      revalidatePath("/bookings");
      revalidatePath(`/booking/${bookingId}`);
      return {
        success: false,
        message:
          "Confirmation Failed: An inventory conflict was detected. The booking has been automatically cancelled.",
      };
    }

    const confirmAction: BookingAction = {
      timestamp: new Date().toISOString(),
      actorId: session.id,
      actorName: session.name,
      action: "Confirmed",
      message: `Booking confirmed by ${session.name}.`,
    };

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "Confirmed",
        data: {
          ...booking.data,
          actions: [...(booking.data.actions || []), confirmAction],
        },
      })
      .eq("id", bookingId);

    if (error) throw error;

    // Send confirmation email
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", booking.user_id)
      .single();

    if (listingData && userData) {
      await sendBookingConfirmationEmail(
        unpackUser(userData),
        unpackedBooking,
        unpackedListing
      );
    }

    revalidatePath("/bookings");
    revalidatePath(`/booking/${bookingId}`);
    return { success: true, message: `Booking has been confirmed.` };
  } catch (e: any) {
    return { success: false, message: `Confirmation Failed: ${e.message}` };
  }
}

/**
 * Marks a booking as completed.
 * @param data - The booking ID.
 * @returns A result object indicating success or failure.
 */
export async function completeBookingAction(
  data: z.infer<typeof BookingActionSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "booking:confirm")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to complete bookings.",
    };
  }

  const { bookingId } = BookingActionSchema.parse(data);

  const { data: bookingData, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingData) {
    return {
      success: false,
      message: "Database Error: Could not find the booking to complete.",
    };
  }

  const unpackedBooking = unpackBooking(bookingData);

  const { data: listingData } = await supabase
    .from("listings")
    .select("id, data")
    .eq("id", unpackedBooking.listingId)
    .single();
  if (!listingData)
    return {
      success: false,
      message: "Database Error: Could not find the associated listing.",
    };
  const unpackedListing = unpackListing(listingData);

  if (session.role === "staff" || session.role === "admin") {
    const { balance } = calculateBookingBalance(
      unpackedBooking,
      unpackedListing
    );
    if (balance > 0) {
      return {
        success: false,
        message:
          "Action Blocked: Cannot complete a booking with an outstanding balance.",
      };
    }
  }

  const completeAction: BookingAction = {
    timestamp: new Date().toISOString(),
    actorId: session.id,
    actorName: session.name,
    action: "Completed",
    message: `Booking marked as completed by ${session.name}.`,
  };

  const updatedBookingData = {
    ...bookingData.data,
    actions: [...(bookingData.data.actions || []), completeAction],
  };

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "Completed",
      data: updatedBookingData,
    })
    .eq("id", bookingId);

  if (error) {
    return {
      success: false,
      message: `Database Error: Failed to complete booking. ${error.message}`,
    };
  }

  // Send summary email
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", unpackedBooking.userId)
    .single();
  if (userData) {
    // We need to pass the *final* booking state to the email, including the 'Completed' action.
    await sendBookingSummaryEmail(
      unpackUser(userData),
      { ...unpackedBooking, ...{ data: updatedBookingData } },
      unpackedListing
    );
  }

  revalidatePath("/bookings");
  revalidatePath(`/booking/${bookingId}`);
  return { success: true, message: "Booking has been marked as completed." };
}

// Zod schema for adding/updating users.
const addUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "guest", "staff"]),
  status: z.enum(["active", "disabled", "provisional"]),
  phone: z.string().optional(),
  notes: z.string().optional(),
  listingIds: z.array(z.string()).optional(),
});

const editUserSchema = addUserSchema.extend({
  email: z
    .string()
    .email("A valid email is required and cannot be removed.")
    .min(1, "Email cannot be empty."),
});

/**
 * Adds a new user to the system.
 * @param data - The user data.
 * @returns A result object indicating success or failure.
 */
export async function addUserAction(data: z.infer<typeof addUserSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "user:create")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to create new users.",
    };
  }

  const validatedFields = addUserSchema.safeParse(data);
  if (!validatedFields.success)
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };

  const {
    name,
    password,
    role: initialRole,
    status,
    notes,
    phone,
    listingIds,
  } = validatedFields.data;
  const email = validatedFields.data.email
    ? validatedFields.data.email.toLowerCase()
    : undefined;

  let role = initialRole;
  if (session.role === "staff") {
    role = "guest"; // Staff can only create guests.
  }

  if (email && !password)
    return {
      success: false,
      message:
        "Validation Error: Password is required if an email is provided.",
    };

  // Use the centralized helper to create the user.
  const result = await findOrCreateGuestUser(supabase, name, email, notes);
  if (result.error) return { success: false, message: result.error };

  const userJsonData: {
    name: string;
    notes?: string;
    phone?: string;
    password?: string;
    listingIds?: string[];
  } = { name, notes, phone, listingIds };
  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase
    .from("users")
    .update({
      role,
      status: email && password ? status : "provisional", // Ensure status is provisional if no credentials
      data: userJsonData,
    })
    .eq("id", result.userId);

  if (error)
    return {
      success: false,
      message: `Database Error: Failed to create user. ${error.message}`,
    };

  if (result.isNewUser && email) {
    await sendWelcomeEmail({ name, email });
  }

  revalidatePath("/dashboard?tab=users", "page");
  return { success: true, message: `User "${name}" was created successfully.` };
}

/**
 * Updates an existing user's details.
 * @param id - The ID of the user to update.
 * @param data - The updated user data.
 * @returns A result object indicating success or failure.
 */
export async function updateUserAction(
  id: string,
  data: z.infer<typeof editUserSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "user:update")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to update user details.",
    };
  }

  const validatedFields = editUserSchema.safeParse(data);
  if (!validatedFields.success)
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };

  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("data, email, role, status")
    .eq("id", id)
    .single();
  if (fetchError || !existingUser)
    return {
      success: false,
      message: "Database Error: Could not find the user to update.",
    };

  const { name, password, role, status, notes, phone, listingIds } =
    validatedFields.data;
  const email = validatedFields.data.email
    ? validatedFields.data.email.toLowerCase()
    : "";

  // Check if any data has actually changed to avoid unnecessary database writes.
  const hasChanged =
    existingUser.data.name !== name ||
    existingUser.email !== email ||
    !!password ||
    existingUser.role !== role ||
    existingUser.status !== status ||
    (existingUser.data.phone || "") !== (phone || "") ||
    (existingUser.data.notes || "") !== (notes || "") ||
    JSON.stringify(existingUser.data.listingIds || []) !==
      JSON.stringify(listingIds || []);

  if (!hasChanged) {
    return {
      success: true,
      message: "No changes were detected.",
      changesMade: false,
    };
  }

  let userJsonData = { ...existingUser.data, name, notes, phone, listingIds };

  // Only hash and update the password if a new one was provided.
  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase
    .from("users")
    .update({ email, role, status, data: userJsonData })
    .eq("id", id);

  if (error)
    return {
      success: false,
      message: `Database Error: Failed to update user. ${error.message}`,
    };

  revalidatePath("/dashboard?tab=users", "page");
  revalidatePath(`/dashboard/edit-user/${id}`);

  return {
    success: true,
    message: `User "${name}" was updated successfully.`,
    changesMade: true,
  };
}

/**
 * Deletes a user from the system. This action is now safer and checks for any bookings.
 * @param userId - The ID of the user to delete.
 * @returns A result object indicating success or failure.
 */
export async function deleteUserAction(userId: string) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "user:delete")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to delete users.",
    };
  }

  if (userId === session.id) {
    return {
      success: false,
      message: "Deletion Failed: You cannot delete your own account.",
    };
  }

  // Safety check: Prevent deleting users with ANY bookings, active or not.
  // For merging, `consolidateUsersAction` should be used instead.
  const { data: anyBookings, error: bookingCheckError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (bookingCheckError) {
    return {
      success: false,
      message: `Database Error: Failed to check for bookings. ${bookingCheckError.message}`,
    };
  }

  if (anyBookings && anyBookings.length > 0) {
    return {
      success: false,
      message:
        'Deletion Failed: This user has bookings associated with them and cannot be deleted. Use the "Consolidate Users" tool to merge this user into another.',
    };
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    console.error(`[DELETE_USER_ACTION] Error: ${error}`);
    return {
      success: false,
      message: `Database Error: Failed to delete user. ${error.message}`,
    };
  }

  revalidatePath("/dashboard?tab=users", "page");
  return { success: true, message: "User has been successfully deleted." };
}

// Zod schema for the user's own profile update form.
const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .min(1, "Email cannot be empty."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Updates the profile of the currently logged-in user.
 * @param data - The updated profile data.
 * @returns A result object indicating success or failure.
 */
export async function updateUserProfileAction(
  data: z.infer<typeof UpdateProfileSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session)
    return {
      success: false,
      message:
        "Authentication Error: You must be logged in to perform this action.",
    };

  if (
    !hasPermission(perms, session, "user:update:own", { ownerId: session.id })
  ) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to update your profile.",
    };
  }

  const validatedFields = UpdateProfileSchema.safeParse(data);
  if (!validatedFields.success)
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };

  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("data")
    .eq("id", session.id)
    .single();
  if (fetchError || !existingUser)
    return {
      success: false,
      message: "Database Error: Could not find your user profile.",
    };

  const { name, password, notes, phone } = validatedFields.data;
  const email = validatedFields.data.email.toLowerCase();
  let userJsonData = { ...existingUser.data, name, notes, phone };

  if (password) {
    userJsonData.password = await hashPassword(password);
  }

  const { error } = await supabase
    .from("users")
    .update({ email, data: userJsonData })
    .eq("id", session.id);
  if (error)
    return {
      success: false,
      message: `Database Error: Failed to update profile. ${error.message}`,
    };

  revalidatePath("/profile");
  revalidatePath("/", "layout"); // Revalidate layout to update header with new user name/email.

  return {
    success: true,
    message: `Your profile has been updated successfully.`,
  };
}

// Zod schema for review submissions.
const ReviewSchema = z.object({
  listingId: z.string(),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters long."),
});

/**
 * Adds a new review or updates an existing one for a listing.
 * @param data - The review data.
 * @returns A result object indicating success or failure.
 */
export async function addOrUpdateReviewAction(
  data: z.infer<typeof ReviewSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session)
    return {
      success: false,
      message:
        "Authentication Error: You must be logged in to submit a review.",
    };

  if (
    !hasPermission(perms, session, "review:create:own", { ownerId: session.id })
  ) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to create or update reviews.",
    };
  }

  const validatedFields = ReviewSchema.safeParse(data);
  if (!validatedFields.success)
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };

  const { listingId, rating, comment } = validatedFields.data;

  // Fetch the listing to update its `reviews` array in the JSONB data.
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("data")
    .eq("id", listingId)
    .single();
  if (fetchError || !listing)
    return {
      success: false,
      message: `Database Error: Could not find the listing.`,
    };

  const reviews = (listing.data.reviews || []) as Review[];
  const existingReviewIndex = reviews.findIndex(
    (r) => r.user_id === session.id
  );

  // All new reviews are 'pending' until approved by an admin.
  const newReviewData: Review = {
    id:
      existingReviewIndex > -1 ? reviews[existingReviewIndex].id : randomUUID(),
    user_id: session.id,
    author: session.name,
    avatar: `https://avatar.vercel.sh/${session.email}.png`,
    rating: rating,
    comment: comment,
    status: "pending",
  };

  // If the user already has a review, replace it. Otherwise, add the new one.
  if (existingReviewIndex > -1) {
    reviews[existingReviewIndex] = newReviewData;
  } else {
    reviews.push(newReviewData);
  }

  // TODO: This could be moved to a database trigger for consistency.
  // When a review is added/updated, we update the entire reviews array in the listing's data.
  const { error: updateError } = await supabase
    .from("listings")
    .update({ data: { ...listing.data, reviews: reviews } })
    .eq("id", listingId);
  if (updateError)
    return {
      success: false,
      message: `Database Error: Failed to submit review. ${updateError.message}`,
    };

  revalidatePath(`/listing/${listingId}`);
  return {
    success: true,
    message: "Your review has been submitted and is awaiting approval.",
  };
}

// Schema for actions that operate on a specific review.
const ReviewActionSchema = z.object({
  listingId: z.string(),
  reviewId: z.string(),
});

/**
 * Approves a pending review.
 * @param data - The listing and review IDs.
 * @returns A result object indicating success or failure.
 */
export async function approveReviewAction(
  data: z.infer<typeof ReviewActionSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "review:approve"))
    return {
      success: false,
      message: "Permission Denied: You are not authorized to approve reviews.",
    };

  const { listingId, reviewId } = data;
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("data")
    .eq("id", listingId)
    .single();
  if (fetchError || !listing)
    return {
      success: false,
      message: "Database Error: Could not find the listing.",
    };

  const reviews = (listing.data.reviews || []) as Review[];
  const reviewIndex = reviews.findIndex((r) => r.id === reviewId);
  if (reviewIndex === -1)
    return {
      success: false,
      message: "Action Failed: The review could not be found.",
    };

  reviews[reviewIndex].status = "approved";

  // Recalculate the listing's average rating based on all approved reviews.
  // TODO: This is another candidate for a database trigger to ensure it's always in sync.
  const approvedReviews = reviews.filter((r) => r.status === "approved");
  const newAverageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) /
        approvedReviews.length
      : 0;

  const updatedData = {
    ...listing.data,
    reviews: reviews,
    rating: newAverageRating,
  };

  const { error: updateError } = await supabase
    .from("listings")
    .update({ data: updatedData })
    .eq("id", listingId);
  if (updateError)
    return {
      success: false,
      message: `Database Error: Failed to approve review. ${updateError.message}`,
    };

  revalidatePath(`/listing/${listingId}`);
  return { success: true, message: "Review approved successfully." };
}

/**
 * Deletes a review.
 * @param data - The listing and review IDs.
 * @returns A result object indicating success or failure.
 */
export async function deleteReviewAction(
  data: z.infer<typeof ReviewActionSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "review:delete"))
    return {
      success: false,
      message: "Permission Denied: You are not authorized to delete reviews.",
    };

  const { listingId, reviewId } = data;
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("data")
    .eq("id", listingId)
    .single();
  if (fetchError || !listing)
    return {
      success: false,
      message: "Database Error: Could not find the listing.",
    };

  const reviews = (listing.data.reviews || []) as Review[];
  const updatedReviews = reviews.filter((r) => r.id !== reviewId);

  // Recalculate average rating after deletion.
  const approvedReviews = updatedReviews.filter((r) => r.status === "approved");
  const newAverageRating =
    approvedReviews.length > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) /
        approvedReviews.length
      : 0;

  const updatedData = {
    ...listing.data,
    reviews: updatedReviews,
    rating: newAverageRating,
  };

  const { error: updateError } = await supabase
    .from("listings")
    .update({ data: updatedData })
    .eq("id", listingId);
  if (updateError)
    return {
      success: false,
      message: `Database Error: Failed to delete review. ${updateError.message}`,
    };

  revalidatePath(`/listing/${listingId}`);
  return { success: true, message: "Review deleted successfully." };
}

// Zod schema for toggling a user's status.
const ToggleUserStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(["active", "disabled"]),
});

/**
 * Toggles a user's status between 'active' and 'disabled'.
 * @param data - The user ID and new status.
 * @returns A result object indicating success or failure.
 */
export async function toggleUserStatusAction(
  data: z.infer<typeof ToggleUserStatusSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "user:update")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to change user statuses.",
    };
  }

  const { userId, status } = ToggleUserStatusSchema.parse(data);
  // Safety check: Prevent users from disabling themselves.
  if (userId === session.id)
    return {
      success: false,
      message: "Action Failed: You cannot change your own status.",
    };

  const { error } = await supabase
    .from("users")
    .update({ status })
    .eq("id", userId);
  if (error)
    return { success: false, message: `Database Error: ${error.message}` };

  revalidatePath("/dashboard?tab=users", "page");
  return {
    success: true,
    message: `User status has been updated to ${status}.`,
  };
}

// Zod schema for bulk deleting listings.
const BulkDeleteListingsSchema = z.object({
  listingIds: z
    .array(z.string())
    .min(1, "At least one listing must be selected for deletion."),
});

/**
 * Deletes multiple listings at once.
 * @param data - An object containing an array of listing IDs.
 * @returns A result object indicating success or failure.
 */
export async function bulkDeleteListingsAction(
  data: z.infer<typeof BulkDeleteListingsSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "listing:delete")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to delete listings.",
    };
  }

  const { listingIds } = BulkDeleteListingsSchema.parse(data);

  // Safety check: Ensure none of the selected listings have active bookings.
  const { data: activeBookings, error: bookingCheckError } = await supabase
    .from("bookings")
    .select("listing_id")
    .in("listing_id", listingIds)
    .in("status", ["Pending", "Confirmed"])
    .limit(1);

  if (bookingCheckError)
    return {
      success: false,
      message: `Database Error: ${bookingCheckError.message}`,
    };
  if (activeBookings && activeBookings.length > 0)
    return {
      success: false,
      message: `Deletion Failed: One or more selected listings have active bookings. Please cancel them first.`,
    };

  const { error } = await supabase
    .from("listings")
    .delete()
    .in("id", listingIds);
  if (error)
    return {
      success: false,
      message: `Database Error: Failed to delete listings. ${error.message}`,
    };

  revalidatePath("/dashboard");
  return {
    success: true,
    message: `${listingIds.length} listing(s) have been deleted.`,
  };
}

// Zod schema for adding a new bill to a booking.
const AddBillSchema = z.object({
  bookingId: z.string(),
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

/**
 * Adds a new bill item to a booking's financial record.
 * @param data - The bill details.
 * @returns A result object indicating success or failure.
 */
export async function addBillAction(data: z.infer<typeof AddBillSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "booking:update")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to add bills to a booking.",
    };
  }

  const validatedFields = AddBillSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };
  }

  const { bookingId, description, amount } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("data")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking) {
    return {
      success: false,
      message: "Database Error: Could not find the booking.",
    };
  }

  const newBill: Bill = {
    id: randomUUID(),
    description,
    amount,
    createdAt: new Date().toISOString(),
    actorName: session.name, // Record who added the bill.
  };

  const updatedBills = [...(booking.data.bills || []), newBill];
  const updatedData = { ...booking.data, bills: updatedBills };

  const { error } = await supabase
    .from("bookings")
    .update({ data: updatedData })
    .eq("id", bookingId);
  if (error) {
    return {
      success: false,
      message: `Database Error: Failed to add bill. ${error.message}`,
    };
  }

  revalidatePath(`/booking/${bookingId}`);
  return { success: true, message: "Bill added successfully." };
}

// Zod schema for recording a payment.
const AddPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  method: z.enum(["Cash", "Transfer", "Debit", "Credit"]),
  notes: z.string().optional(),
});

/**
 * Records a new payment made for a booking.
 * @param data - The payment details.
 * @returns A result object indicating success or failure.
 */
export async function addPaymentAction(data: z.infer<typeof AddPaymentSchema>) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "booking:update")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to record payments.",
    };
  }

  const validatedFields = AddPaymentSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };
  }

  const { bookingId, amount, method, notes } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("data")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking) {
    return {
      success: false,
      message: "Database Error: Could not find the booking.",
    };
  }

  const newPayment: Payment = {
    id: randomUUID(),
    amount,
    method,
    notes,
    timestamp: new Date().toISOString(),
    actorName: session.name, // Record who recorded the payment.
  };

  const updatedPayments = [...(booking.data.payments || []), newPayment];
  const updatedData = { ...booking.data, payments: updatedPayments };

  const { error } = await supabase
    .from("bookings")
    .update({ data: updatedData })
    .eq("id", bookingId);
  if (error) {
    return {
      success: false,
      message: `Database Error: Failed to record payment. ${error.message}`,
    };
  }

  revalidatePath(`/booking/${bookingId}`);
  return { success: true, message: "Payment recorded successfully." };
}

const AvailableInventorySchema = z.object({
  listingId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  excludeBookingId: z.string().optional(),
});

/**
 * Fetches available inventory units for a given date range, excluding a specific booking.
 * This is used in the booking edit form to show which units can be assigned.
 * @param data - The criteria for checking availability.
 * @returns An object with an array of available inventory IDs, or an error message.
 */
export async function getAvailableInventoryForBookingAction(
  data: z.infer<typeof AvailableInventorySchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();
  if (!session || !hasPermission(perms, session, "booking:update")) {
    return { success: false, message: "Permission Denied" };
  }

  const { listingId, startDate, endDate, excludeBookingId } = data;
  try {
    const inventoryIds = await findAvailableInventory(
      supabase,
      listingId,
      startDate,
      endDate,
      excludeBookingId
    );
    return { success: true, inventoryIds };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

const SetDiscountSchema = z.object({
  bookingId: z.string(),
  discountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative.")
    .max(
      MAX_DISCOUNT_PERCENT,
      `Discount cannot exceed ${MAX_DISCOUNT_PERCENT}%.`
    ),
  reason: z.string().min(1, "A reason for the discount is required."),
});

/**
 * Sets a discount percentage on a booking.
 * @param data - The booking ID and discount percentage.
 * @returns A result object indicating success or failure.
 */
export async function setDiscountAction(
  data: z.infer<typeof SetDiscountSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "booking:update")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to set a discount.",
    };
  }

  const validatedFields = SetDiscountSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Please check the form for invalid data.",
    };
  }

  const { bookingId, discountPercentage, reason } = validatedFields.data;

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("data")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking) {
    return {
      success: false,
      message: "Database Error: Could not find the booking.",
    };
  }

  const discountAction: BookingAction = {
    timestamp: new Date().toISOString(),
    actorId: session.id,
    actorName: session.name,
    action: "Updated",
    message: `Discount set to ${discountPercentage.toFixed(2)}% by ${
      session.name
    }. Reason: ${reason}`,
  };

  const updatedActions = [...(booking.data.actions || []), discountAction];
  const updatedData = {
    ...booking.data,
    discount: discountPercentage,
    actions: updatedActions,
  };

  const { error } = await supabase
    .from("bookings")
    .update({ data: updatedData })
    .eq("id", bookingId);
  if (error) {
    return {
      success: false,
      message: `Database Error: Failed to set discount. ${error.message}`,
    };
  }

  revalidatePath(`/booking/${bookingId}`);
  return { success: true, message: "Discount applied successfully." };
}

const SendReportEmailSchema = z.object({
  listingId: z.string().optional(),
  location: z.string().optional(),
  fromDate: z.string(),
  toDate: z.string(),
  email: z.string().email(),
});

function getDailySummaryCsv(
  bookings: Booking[],
  dateRange: { from: string; to: string },
  listing: Listing | null
) {
  const dailyData: Record<
    string,
    {
      date: string;
      unitsUsed: number;
      dailyCharge: number;
      payments: Record<Payment["method"], number>;
      totalPaid: number;
      balance: number;
    }
  > = {};
  const reportDays = daysInterval(dateRange.from, dateRange.to);

  reportDays.forEach((day: any) => {
    const dayStr = day;
    dailyData[dayStr] = {
      date: dayStr,
      unitsUsed: 0,
      dailyCharge: 0,
      payments: { Cash: 0, Transfer: 0, Debit: 0, Credit: 0 },
      totalPaid: 0,
      balance: 0,
    };
  });

  bookings.forEach((booking) => {
    const listingForBooking = {
      price: booking.price,
      price_unit: booking.price_unit,
      ...listing,
    };
    const bookingDays = daysInterval(booking.startDate, booking.endDate);
    const bookingDuration =
      differenceInDays(booking.endDate, booking.startDate) || 1;
    const dailyRate = (listingForBooking.price || 0) / bookingDuration;

    bookingDays.forEach((day: any) => {
      if (day >= dateRange.from && day <= dateRange.to) {
        const dayStr = day;
        if (dailyData[dayStr]) {
          dailyData[dayStr].unitsUsed += (booking.inventoryIds || []).length;
          dailyData[dayStr].dailyCharge +=
            dailyRate * (booking.inventoryIds || []).length;
        }
      }
    });

    (booking.payments || []).forEach((payment) => {
      const paymentDayStr = payment.timestamp;
      if (dailyData[paymentDayStr]) {
        dailyData[paymentDayStr].payments[payment.method] =
          (dailyData[paymentDayStr].payments[payment.method] || 0) +
          payment.amount;
        dailyData[paymentDayStr].totalPaid += payment.amount;
      }
    });
  });

  Object.values(dailyData).forEach((day) => {
    day.balance = day.dailyCharge - day.totalPaid;
  });

  const headers = [
    "Date",
    "Units Used",
    "Daily Charge",
    "Paid (Cash)",
    "Paid (Transfer)",
    "Paid (Debit)",
    "Paid (Credit)",
    "Owed",
    "Currency",
  ];
  const currencyCode = listing?.currency || bookings[0]?.currency || "NGN";
  const rows = Object.values(dailyData).map((d) =>
    [
      d.date,
      d.unitsUsed,
      d.dailyCharge.toFixed(2),
      d.payments.Cash.toFixed(2),
      d.payments.Transfer.toFixed(2),
      d.payments.Debit.toFixed(2),
      d.payments.Credit.toFixed(2),
      d.balance.toFixed(2),
      currencyCode,
    ]
      .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function sendReportEmailAction(
  data: z.infer<typeof SendReportEmailSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "listing:read")) {
    return { success: false, message: "Permission Denied" };
  }

  const validatedFields = SendReportEmailSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid data provided for report." };
  }

  const { listingId, location, fromDate, toDate, email } =
    validatedFields.data;

  let listing: Listing | null = null;
  let bookings: Booking[];

  if (listingId) {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("id, data, location")
      .eq("id", listingId)
      .single();
    if (listingError || !listingData) {
      return { success: false, message: "Could not find listing for report." };
    }
    listing = unpackListing({ ...listingData, id: listingId });
    bookings = await getBookingsByDateRange(listingId, fromDate, toDate);
  } else {
    // Global or location-based report
    bookings = await getAllBookings({
      fromDate,
      toDate,
      location: location,
    });
    // For location reports, create a mock listing object for the email template
    if (location) {
      listing = {
        id: location,
        name: `Location: ${decodeURIComponent(location)}`,
        location: location,
        type: "hotel", // placeholder
        description: "",
        images: [],
        price: 0,
        price_unit: "night",
        currency: "NGN",
        rating: 0,
        reviews: [],
        features: [],
        max_guests: 0,
      };
    }
  }

  try {
    const headers = [
      "Booking ID",
      "Guest",
      "Venue",
      "Units",
      "Start Date",
      "End Date",
      "Duration (days)",
      "Paid",
      "Owed",
      "Balance",
      "Status",
      "Currency",
    ];
    const currencyCode = listing?.currency || bookings[0]?.currency || "NGN";

    const rows = bookings.map((b) => {
      const financials = calculateBookingFinancials(
        b,
        listing ? listing : ({ ...b } as Listing)
      );
      return [
        b.id,
        b.userName,
        b.listingName,
        b.inventoryNames?.join(", ") || "N/A",
        b.startDate,
        b.endDate,
        financials.stayDuration,
        financials.totalPayments.toFixed(2),
        financials.totalBill.toFixed(2),
        financials.balance.toFixed(2),
        b.status,
        currencyCode,
      ]
        .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const dateRange = { from: fromDate, to: toDate };
    const dailyCsvContent = getDailySummaryCsv(bookings, dateRange, listing);

    await sendReportEmail({
      email,
      listing, // Can be null for global reports
      bookings,
      dateRange,
      csvContent,
      dailyCsvContent,
    });
    return { success: true, message: `Report successfully sent to ${email}` };
  } catch (error) {
    console.error("Failed to send report email:", error);
    return {
      success: false,
      message: "An error occurred while sending the email.",
    };
  }
}

const WalkInReservationSchema = z
  .object({
    listingId: z.string().min(1, "Please select a listing."),
    userId: z.string().optional(),
    newCustomerName: z.string().optional(),
    guests: z.coerce.number().int().min(1, "At least one guest is required."),
    units: z.coerce.number().int().min(1, "At least one unit is required."),
    bills: z
      .array(
        z.object({
          description: z.string().min(1, "Description cannot be empty."),
          amount: z.coerce
            .number()
            .positive("Amount must be a positive number."),
          paid: z.boolean(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.userId && !data.newCustomerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newCustomerName"],
        message: "Please enter a name for the customer.",
      });
    }
  });

export async function createWalkInReservationAction(
  data: z.infer<typeof WalkInReservationSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "booking:create")) {
    return {
      success: false,
      message: "Permission Denied: You are not authorized to create bookings.",
    };
  }

  const validatedFields = WalkInReservationSchema.safeParse(data);
  if (!validatedFields.success) {
    const messages = Object.values(
      validatedFields.error.flatten().fieldErrors
    ).flat();
    return {
      success: false,
      message: `Validation Error: ${messages.join(", ")}`,
    };
  }

  const { listingId, newCustomerName, guests, units, bills } =
    validatedFields.data;
  const actorId = session.id;
  const actorName = session.name;

  try {
    if (!newCustomerName) {
      throw new Error("No customer name specified.");
    }

    const result = await findOrCreateGuestUser(supabase, newCustomerName);
    if (result.error) throw new Error(result.error);
    const finalUserId = result.userId;
    const finalUserName = result.userName;

    const today = new Date().toISOString().split("T")[0];

    const { data: listingData } = await supabase
      .from("listings")
      .select("*, listing_inventory(count)")
      .eq("id", listingId)
      .single();

    if (!listingData) throw new Error("Selected listing not found.");

    const listing = unpackListing(listingData);

    if (guests > listing.max_guests * units) {
      return {
        success: false,
        message: `Number of guests (${guests}) exceeds the maximum allowed (${
          listing.max_guests * units
        }) for ${units} unit(s).`,
      };
    }

    if (units > (listing.inventoryCount || 0)) {
      return {
        success: false,
        message: `Number of units (${units}) exceeds the total available for this listing (${
          listing.inventoryCount || 0
        }).`,
      };
    }

    const endDate =
      listing.type === ListingTypes.HOTEL ? subDays(today, -1) : today;

    const availableInventory = await findAvailableInventory(
      supabase,
      listingId,
      today,
      endDate
    );
    if (availableInventory.length < units) {
      return {
        success: false,
        message: `Only ${availableInventory.length} units available for today.`,
      };
    }
    const inventoryToBook = availableInventory.slice(0, units);

    const initialBills: Bill[] = (bills || []).map((bill) => ({
      id: randomUUID(),
      description: bill.description,
      amount: bill.amount,
      createdAt: new Date().toISOString(),
      actorName: actorName,
    }));

    const initialPayments: Payment[] = (bills || [])
      .filter((bill) => bill.paid)
      .map((bill) => ({
        id: randomUUID(),
        amount: bill.amount,
        method: "Cash", // Defaulting to Cash for walk-ins
        notes: `Paid on creation for: ${bill.description}`,
        timestamp: new Date().toISOString(),
        actorName: actorName,
      }));

    const initialAction: BookingAction = {
      timestamp: new Date().toISOString(),
      actorId: actorId,
      actorName: actorName,
      action: "Created",
      message: `Walk-in booking created by staff member ${actorName}.`,
    };

    let bookingStatus: "Pending" | "Confirmed" | "Completed" = "Pending";
    if (bills && bills.length > 0) {
      const paidBills = bills.filter((b) => b.paid);
      if (bills.every((b) => b.paid)) {
        bookingStatus = "Completed";
      } else if (paidBills.length > 0) {
        bookingStatus = "Confirmed";
      }
    }

    if (bookingStatus === "Completed") {
      initialAction.message = `Walk-in booking created and marked as completed by staff member ${actorName}.`;
    } else if (bookingStatus === "Confirmed") {
      initialAction.message = `Walk-in booking created and confirmed by staff member ${actorName}.`;
    }

    const bookingData = {
      guests: guests,
      bookingName: finalUserName,
      inventoryIds: inventoryToBook,
      actions: [initialAction],
      createdAt: new Date().toISOString(),
      bills: initialBills,
      payments: initialPayments,
      discount: 0,
    };

    const { data: newBooking, error: createError } = await supabase
      .from("bookings")
      .insert({
        listing_id: listingId,
        user_id: finalUserId,
        start_date: today,
        end_date: endDate,
        status: bookingStatus,
        data: bookingData,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    revalidatePath("/bookings");
    return {
      success: true,
      message: `Reservation created for ${finalUserName} with status: ${bookingStatus}.`,
      bookingId: newBooking.id,
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

const ConsolidateUsersSchema = z.object({
  primaryUserId: z.string(),
  userIdsToMerge: z.array(z.string()).min(1),
});

const ConsolidateMultipleUsersSchema = z.object({
  groups: z.array(ConsolidateUsersSchema),
});

/**
 * Consolidates multiple groups of user accounts into their respective primary accounts.
 * @param data - An array of groups to merge, each with a primary user ID and IDs to merge.
 * @returns A summary result object.
 */
export async function consolidateMultipleUsersAction(
  data: z.infer<typeof ConsolidateMultipleUsersSchema>
) {
  const { groups } = data;
  let successCount = 0;
  let failureCount = 0;

  for (const group of groups) {
    const result = await consolidateUsersAction(group);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      // Log the error for debugging, but don't stop the whole process.
      console.error(
        `Failed to merge group with primary user ${group.primaryUserId}: ${result.message}`
      );
    }
  }

  revalidatePath("/dashboard?tab=users");

  if (failureCount > 0) {
    return {
      success: false,
      message: `Consolidation finished with errors. Successfully merged: ${successCount}. Failed to merge: ${failureCount}. Check server logs for details.`,
    };
  }

  return {
    success: true,
    message: `Successfully merged ${successCount} group(s).`,
  };
}

/**
 * Consolidates multiple user accounts into a single primary account.
 * Re-assigns all bookings from the merged users to the primary user and then deletes the merged users.
 * @param data - The primary user ID and the IDs of users to merge.
 * @returns A result object indicating success or failure.
 */
export async function consolidateUsersAction(
  data: z.infer<typeof ConsolidateUsersSchema>
) {
  const perms = await preloadPermissions();
  const supabase = createSupabaseAdminClient();
  const session = await getSession();

  if (!session || !hasPermission(perms, session, "user:delete")) {
    return {
      success: false,
      message:
        "Permission Denied: You are not authorized to consolidate users.",
    };
  }

  const validatedFields = ConsolidateUsersSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Validation Error: Invalid data provided for consolidation.",
    };
  }

  const { primaryUserId, userIdsToMerge } = validatedFields.data;

  if (userIdsToMerge.includes(primaryUserId)) {
    return {
      success: false,
      message: "Error: Cannot merge a user into themselves.",
    };
  }

  // Step 1: Validate that all users exist before attempting any operations.
  const allUserIds = [primaryUserId, ...userIdsToMerge];
  const { data: users, error: validationError } = await supabase
    .from("users")
    .select("id")
    .in("id", allUserIds);

  if (validationError) {
    return {
      success: false,
      message: `Database Error: Failed to validate users. ${validationError.message}`,
    };
  }

  if (users.length !== allUserIds.length) {
    return {
      success: false,
      message:
        "Merge Failed: One or more of the selected users no longer exist. Please refresh and try again.",
    };
  }

  // Step 2: Re-assign all bookings from the users-to-be-merged to the primary user.
  const { error: updateBookingsError } = await supabase
    .from("bookings")
    .update({ user_id: primaryUserId })
    .in("user_id", userIdsToMerge);

  if (updateBookingsError) {
    console.error(
      "[CONSOLIDATE_USERS] Error updating bookings:",
      updateBookingsError
    );
    return {
      success: false,
      message: `Database Error: Failed to re-assign bookings. ${updateBookingsError.message}`,
    };
  }

  // Step 3: Delete the now-redundant user accounts.
  const { error: deleteUsersError } = await supabase
    .from("users")
    .delete()
    .in("id", userIdsToMerge);

  if (deleteUsersError) {
    console.error(
      "[CONSOLIDATE_USERS] Error deleting merged users:",
      deleteUsersError
    );
    // At this point, bookings are reassigned, which is better than a partial failure.
    // We return an error but acknowledge that the main goal was partially achieved.
    return {
      success: false,
      message: `Database Error: Failed to delete the merged user accounts, but their bookings were re-assigned. ${deleteUsersError.message}`,
    };
  }

  return {
    success: true,
    message: `${userIdsToMerge.length} user(s) were successfully merged.`,
  };
}
