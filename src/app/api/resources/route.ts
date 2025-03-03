import { NextRequest, NextResponse } from "next/server";
import { and, or, ilike, asc, count as sqlCount } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import { resourcesTable } from "~/db/schemas";

export const GET = catchAsync(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;

  const {
    limit,
    offset,
    q = "",
  } = await validateSchema<{
    limit: number;
    offset: number;
    q: string;
  }>({
    object: {
      limit: Yup.number().integer("Limit must be an integer").optional(),
      offset: Yup.number().integer("Offset must be an integer").optional(),
      q: Yup.string().optional(),
    },
    data: {
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
      q: searchParams.get("q") || undefined,
    },
  });

  const queryCondition = or(
    ilike(resourcesTable.name, `%${q}%`),
    ilike(resourcesTable.description, `%${q}%`)
  );

  const baseQuery = db.select().from(resourcesTable).where(queryCondition);

  if (limit === undefined || offset === undefined) {
    const locations = await baseQuery.orderBy(asc(resourcesTable.created_at));
    return NextResponse.json(locations);
  }

  const [data, totalCount] = await Promise.all([
    baseQuery.limit(limit).offset(offset).orderBy(asc(resourcesTable.created_at)),
    db.select({ count: sqlCount() }).from(resourcesTable).where(queryCondition),
  ]);

  return NextResponse.json({
    data,
    total: totalCount[0]?.count ?? 0,
  });
});
