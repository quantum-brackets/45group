import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import {
  resourceFacilitiesTable,
  resourceGroupsTable,
  resourceRulesTable,
  resourcesTable,
} from "~/db/schemas/resources";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import { resourceSchema } from "../route";

export const DELETE = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const [resource] = await db
    .delete(resourcesTable)
    .where(eq(resourcesTable.id, resourceId))
    .returning();

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json({ message: "Resource deleted successfully" });
});

export const GET = catchAsync(async (_: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;

  const [resource] = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.id, resourceId));

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json(resource);
});

const schema = {
  rules: resourceSchema.rules.optional(),
  facilities: resourceSchema.facilities.optional(),
  groups: resourceSchema.groups.optional(),
};

export const PATCH = catchAsync(async (req: NextRequest, context: { params: { id: string } }) => {
  const resourceId = context.params.id;
  const body = await req.formData();

  const { facilities, rules, groups } = await validateSchema({
    object: schema,
    isFormData: true,
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

  await Promise.all([
    groups?.length
      ? db
          .update(resourceGroupsTable)
          .set(
            groups.map(({ id: group_id, num }: { id: string; num: number }) => ({
              resource_id: resource.id,
              group_id,
              num,
            }))
          )
          .where(
            and(
              eq(resourceGroupsTable.resource_id, resource.id),
              inArray(
                resourceGroupsTable.group_id,
                groups.map(({ id }: { id: string }) => id)
              )
            )
          )
      : Promise.resolve(),

    facilities?.length
      ? db
          .update(resourceFacilitiesTable)
          .set(
            facilities.map((facility_id: string) => ({
              resource_id: resource.id,
              facility_id,
            }))
          )
          .where(
            and(
              eq(resourceFacilitiesTable.resource_id, resource.id),
              inArray(
                resourceFacilitiesTable.facility_id,
                facilities.map(({ id }: { id: string }) => id)
              )
            )
          )
      : Promise.resolve(),

    rules?.length
      ? db
          .update(resourceRulesTable)
          .set(
            rules.map((rule_id: string) => ({
              resource_id: resource.id,
              rule_id,
            }))
          )
          .where(
            and(
              eq(resourceRulesTable.resource_id, resource.id),
              inArray(
                resourceRulesTable.rule_id,
                rules.map(({ id }: { id: string }) => id)
              )
            )
          )
      : Promise.resolve(),
  ]);

  return NextResponse.json(resource);
});
