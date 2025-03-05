import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { groupsTable } from "~/db/schemas/groups";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { name } = await validateSchema<{
    name: string;
  }>({
    object: {
      name: Yup.string().required("`name` is required"),
    },
    data: body,
  });

  const [newGroup] = await db
    .insert(groupsTable)
    .values({
      name,
    })
    .returning();

  return NextResponse.json(newGroup);
});

export const GET = catchAsync(async () => {
  const rules = await db.select().from(groupsTable).orderBy(asc(groupsTable.created_at));

  return NextResponse.json(rules);
});
