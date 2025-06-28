import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { resourceGroupsTable, resourcesTable } from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";

export const POST = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { group_ids } = await validateSchema<{
    group_ids: { id: string; num: number }[];
  }>({
    object: {
      group_ids: Yup.array()
        .of(
          Yup.object({
            id: Yup.string().uuid("Must be a valid UUID"),
            num: Yup.number().required("`num` is required"),
          })
        )
        .required("`group_ids` is required"),
    },
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

  await db.insert(resourceGroupsTable).values(
    group_ids.map(({ id: group_id, num }) => ({
      resource_id: resource.id,
      group_id,
      num,
    }))
  );

  return NextResponse.json({ message: "Groups successfully associated with the resource." });
});

export const DELETE = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { group_ids } = await validateSchema<{
    group_ids: string[];
  }>({
    object: {
      group_ids: Yup.array()
        .of(Yup.string().uuid("Must be a valid UUID"))
        .required("`group_ids` is required"),
    },
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
    .delete(resourceGroupsTable)
    .where(
      and(
        eq(resourceGroupsTable.resource_id, resourceId),
        inArray(resourceGroupsTable.group_id, group_ids)
      )
    )
    .execute();

  return NextResponse.json({ message: "Groups successfully removed from the resource." });
});
