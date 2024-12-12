import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { rulesTable } from "~/db/schemas/rules";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { name, description, category } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      description: Yup.string().optional(),
      category: Yup.string()
        .oneOf(["house_rules", "cancellations"])
        .required("`category` is required"),
    },
    data: body,
  });

  const newRule = await db
    .insert(rulesTable)
    .values({
      name,
      category,
      description,
    })
    .returning();

  return NextResponse.json(newRule);
});

export const GET = catchAsync(async () => {
  const rules = await db.select().from(rulesTable);

  return NextResponse.json(rules);
});
