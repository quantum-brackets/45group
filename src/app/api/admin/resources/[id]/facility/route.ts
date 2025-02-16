import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { resourceFacilitiesTable, resourcesTable } from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";

type Schema = {
  facility_ids: string[];
};

const schema = {
  facility_ids: Yup.array()
    .of(Yup.string().uuid("Must be a valid UUID"))
    .required("`facility_ids` is required"),
};

export const POST = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { facility_ids } = await validateSchema<Schema>({
    object: schema,
    data: body,
  });

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.id, resourceId));

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  await db.insert(resourceFacilitiesTable).values(
    facility_ids.map((facility_id: string) => ({
      resource_id: resource.id,
      facility_id,
    }))
  );

  return NextResponse.json({ message: "Facilities successfully associated with the resource." });
});

export const DELETE = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { facility_ids } = await validateSchema<Schema>({
    object: schema,
    data: body,
  });

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.id, resourceId));

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  await db
    .delete(resourceFacilitiesTable)
    .where(
      and(
        eq(resourceFacilitiesTable.resource_id, resourceId),
        inArray(resourceFacilitiesTable.facility_id, facility_ids)
      )
    )
    .execute();

  return NextResponse.json({ message: "Facilities successfully removed from the resource." });
});
