import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { resourceRulesTable, resourcesTable } from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";

type Schema = {
  rule_ids: string[];
};

const schema = {
  rule_ids: Yup.array()
    .of(Yup.string().uuid("Must be a valid UUID"))
    .required("`rule_ids` is required"),
};

export const POST = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { rule_ids } = await validateSchema<Schema>({
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

  await db.insert(resourceRulesTable).values(
    rule_ids.map((rule_id: string) => ({
      resource_id: resource.id,
      rule_id,
    }))
  );

  return NextResponse.json({ message: "Rules successfully associated with the resource." });
});

export const DELETE = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.json();

  const { rule_ids } = await validateSchema<Schema>({
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
    .delete(resourceRulesTable)
    .where(
      and(
        eq(resourceRulesTable.resource_id, resourceId),
        inArray(resourceRulesTable.rule_id, rule_ids)
      )
    )
    .execute();

  return NextResponse.json({ message: "Rules successfully removed from the resource." });
});
