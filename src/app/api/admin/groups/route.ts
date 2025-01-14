import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { groupsTable } from "~/db/schemas/groups";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { name, num } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      num: Yup.number().integer("`num` must be an integer").required("`num` is required"),
    },
    data: body,
  });

  const newRule = await db
    .insert(groupsTable)
    .values({
      name,
      num,
    })
    .returning();

  return NextResponse.json(newRule);
});

export const GET = catchAsync(async () => {
  const rules = await db.select().from(groupsTable).orderBy(asc(groupsTable.created_at));

  return NextResponse.json(rules);
});
