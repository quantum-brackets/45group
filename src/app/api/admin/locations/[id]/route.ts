import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { locationsTable } from "~/db/schemas/locations";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import { mediasTable } from "~/db/schemas/media";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const locationId = context.params.id;

  const [location] = await db
    .delete(locationsTable)
    .where(eq(locationsTable.id, locationId))
    .returning();

  if (!location)
    return appError({
      status: 404,
      error: "Location not found",
    });

  return NextResponse.json({ message: "Location deleted successfully" });
});

export const GET = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const locationId = context.params.id;

  const locations = await db
    .select({
      location: locationsTable,
      media: mediasTable,
    })
    .from(locationsTable)
    .leftJoin(mediasTable, eq(mediasTable.location_id, locationsTable.id))
    .where(eq(locationsTable.id, locationId));

  if (!locations.length) {
    return appError({
      status: 404,
      error: "Location not found",
    });
  }

  const location = locations.reduce(
    (acc, curr) => {
      if (!acc.id) {
        Object.assign(acc, curr.location);
        acc.medias = [];
      }

      if (curr.media?.id) {
        acc.medias.push(curr.media);
      }

      return acc;
    },
    { medias: [] } as any
  );

  return NextResponse.json(location);
});

export const PATCH = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const locationId = context.params.id;
  const body = await req.formData();

  const validatedData = await validateSchema({
    object: {
      name: Yup.string().optional(),
      state: Yup.string().optional(),
      city: Yup.string().optional(),
      description: Yup.string().optional(),
    },
    isFormData: true,
    data: body,
  });

  const [updatedLocation] = await db
    .update(locationsTable)
    .set({
      ...validatedData,
    })
    .where(eq(locationsTable.id, locationId))
    .returning();

  if (!updatedLocation)
    return appError({
      status: 404,
      error: "Location not found",
    });

  return NextResponse.json(updatedLocation);
});
