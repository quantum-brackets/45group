import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { resourcesTable } from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const [resource] = await db
    .delete(resourcesTable)
    .where(eq(resourcesTable.id, resourceId))
    .returning();

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json({ message: "Resource deleted successfully" });
});

export const GET = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.id, resourceId));

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json(resource);
});
