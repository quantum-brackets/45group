import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { facilitiesTable } from "~/db/schemas/facilities";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const facilityId = context.params.id;

  const [facility] = await db
    .delete(facilitiesTable)
    .where(eq(facilitiesTable.id, facilityId))
    .returning();

  if (!facility)
    return appError({
      status: 404,
      error: "Facility not found",
    });

  return NextResponse.json({ message: "Facility deleted successfully" });
});
