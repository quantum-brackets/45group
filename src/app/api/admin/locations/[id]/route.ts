import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { locationsTable } from "~/db/schemas/locations";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

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

  const [location] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.id, locationId));

  if (!location)
    return appError({
      status: 404,
      error: "Location not found",
    });

  return NextResponse.json(location);
});
