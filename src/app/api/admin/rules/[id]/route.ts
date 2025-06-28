import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { rulesTable } from "~/db/schemas/rules";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const ruleId = context.params.id;

  const [rule] = await db.delete(rulesTable).where(eq(rulesTable.id, ruleId)).returning();

  if (!rule)
    return appError({
      status: 404,
      error: "Rule not found",
    });

  return NextResponse.json({ message: "Rule deleted successfully" });
});
