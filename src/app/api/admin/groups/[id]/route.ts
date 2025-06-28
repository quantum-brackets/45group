import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";
import { groupsTable } from "~/db/schemas/groups";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const groupId = context.params.id;

  const [group] = await db.delete(groupsTable).where(eq(groupsTable.id, groupId)).returning();

  if (!group)
    return appError({
      status: 404,
      error: "Group not found",
    });

  return NextResponse.json({ message: "Group deleted successfully" });
});
