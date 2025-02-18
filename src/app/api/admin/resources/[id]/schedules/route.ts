import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/db";
import { resourceSchedulesTable } from "~/db/schemas";
import catchAsync from "~/utils/catch-async";

export const GET = catchAsync(async (_: NextRequest, { params }: { params: { id: string } }) => {
  const schedules = await db.query.resourceSchedulesTable.findMany({
    where: eq(resourceSchedulesTable.resource_id, params.id),
    orderBy: resourceSchedulesTable.day_of_week,
  });

  return NextResponse.json(schedules);
});
