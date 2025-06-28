import { NextRequest, NextResponse } from "next/server";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { appError } from "~/utils/helpers";

export const GET = catchAsync(async (_: NextRequest, context: { params: { slug: string } }) => {
  const resourceSlug = context.params.slug;

  const resource = await db.query.resourcesTable.findFirst({
    where: (resource, { eq }) => eq(resource.handle, resourceSlug),
    with: {
      facilities: true,
      medias: true,
      location: true,
      groups: true,
      rules: {
        with: {
          rule: true,
        },
      },
      schedules: true,
    },
  });

  if (!resource)
    return appError({
      status: 404,
      error: "Resource not found",
    });

  return NextResponse.json(resource);
});
