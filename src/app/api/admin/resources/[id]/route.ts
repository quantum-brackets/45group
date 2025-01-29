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
import { resourceSchema } from "~/utils/yup-schemas/resource";

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
  rules: Yup.object({
    add: resourceSchema.rules,
    remove: resourceSchema.rules,
  }).optional(),
  facilities: Yup.object({
    add: resourceSchema.facilities,
    remove: resourceSchema.facilities,
  }).optional(),
  groups: Yup.object({
    add: resourceSchema.groups,
    remove: Yup.array().of(Yup.string().uuid("Must be a valid UUID")).optional(),
  }).optional(),
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
    Promise.all([
      rules?.remove?.length
        ? db
            .delete(resourceRulesTable)
            .where(
              and(
                eq(resourceRulesTable.resource_id, resource.id),
                inArray(resourceRulesTable.rule_id, rules.remove)
              )
            )
        : Promise.resolve(),

      facilities?.remove?.length
        ? db
            .delete(resourceFacilitiesTable)
            .where(
              and(
                eq(resourceFacilitiesTable.resource_id, resource.id),
                inArray(resourceFacilitiesTable.facility_id, facilities.remove)
              )
            )
        : Promise.resolve(),

      groups?.remove?.length
        ? db
            .delete(resourceGroupsTable)
            .where(
              and(
                eq(resourceGroupsTable.resource_id, resource.id),
                inArray(resourceGroupsTable.group_id, groups.remove)
              )
            )
        : Promise.resolve(),
    ]),
    Promise.all([
      // Add new rules
      rules?.add?.length
        ? db
            .insert(resourceRulesTable)
            .values(
              rules.add.map((rule_id: string) => ({
                resource_id: resource.id,
                rule_id,
              }))
            )
            .onConflictDoNothing()
        : Promise.resolve(),

      // Add new facilities
      facilities?.add?.length
        ? db
            .insert(resourceFacilitiesTable)
            .values(
              facilities.add.map((facility_id: string) => ({
                resource_id: resource.id,
                facility_id,
              }))
            )
            .onConflictDoNothing()
        : Promise.resolve(),

      // Add new groups
      groups?.add?.length
        ? db
            .insert(resourceGroupsTable)
            .values(
              groups.add.map(({ id: group_id, num }: { id: string; num: number }) => ({
                resource_id: resource.id,
                group_id,
                num,
              }))
            )
            .onConflictDoNothing()
        : Promise.resolve(),
    ]),
  ]);

  const [updatedResource] = await db
    .select()
    .from(resourcesTable)
    .leftJoin(resourceRulesTable, eq(resourcesTable.id, resourceRulesTable.resource_id))
    .leftJoin(resourceFacilitiesTable, eq(resourcesTable.id, resourceFacilitiesTable.resource_id))
    .leftJoin(resourceGroupsTable, eq(resourcesTable.id, resourceGroupsTable.resource_id))
    .where(eq(resourcesTable.id, resourceId));

  return NextResponse.json(updatedResource);
});
