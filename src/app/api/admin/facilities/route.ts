import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { facilitiesTable } from "~/db/schemas/facilities";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { name, description } = await validateSchema<{ name: string; description: string }>({
    object: {
      name: Yup.string().required("`name` is required"),
      description: Yup.string().optional(),
    },
    data: body,
  });

  const [newFacility] = await db
    .insert(facilitiesTable)
    .values({
      name,
      description,
    })
    .returning();

  return NextResponse.json(newFacility);
});

export const GET = catchAsync(async () => {
  const facilities = await db.select().from(facilitiesTable);

  return NextResponse.json(facilities);
});
