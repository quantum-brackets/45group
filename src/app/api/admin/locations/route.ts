import { asc, ilike, or, count as sqlCount } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { db } from "~/db";
import { locationsTable } from "~/db/schemas/locations";
import { mediasTable } from "~/db/schemas/media";
import UploadService from "~/services/upload";
import catchAsync from "~/utils/catch-async";
import { validateSchema } from "~/utils/helpers";
import YupValidation from "~/utils/yup-validations";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.formData();

  const { images, ...validatedData } = await validateSchema({
    object: {
      name: Yup.string().required("`name` is required"),
      state: Yup.string().required("`state` is required"),
      city: Yup.string().required("`city` is required"),
      description: Yup.string().optional(),
      images: YupValidation.validateFiles().required("`images` is required"),
    },
    isFormData: true,
    data: body,
  });

  const imageUrls = await UploadService.uploadMultiple(
    images,
    `locations/${validatedData.state}/${validatedData.city}/${validatedData.name}`
  );

  const [newLocation] = await db
    .insert(locationsTable)
    .values({
      ...validatedData,
    })
    .returning();

  await Promise.all(
    imageUrls.map(({ url, size, type }) =>
      db.insert(mediasTable).values({
        url,
        size,
        mimeType: type,
        location_id: newLocation.id,
      })
    )
  );

  return NextResponse.json(newLocation);
});

export const GET = catchAsync(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;

  const {
    limit,
    offset,
    q = "",
  } = await validateSchema({
    object: {
      limit: Yup.number()
        .optional()
        .transform((value) => (isNaN(value) ? undefined : value))
        .integer("Limit must be an integer"),
      offset: Yup.number()
        .optional()
        .transform((value) => (isNaN(value) ? undefined : value))
        .integer("Offset must be an integer"),
      q: Yup.string().optional(),
    },
    data: {
      limit: searchParams.get("limit") !== null ? parseInt(searchParams.get("limit")!) : undefined,
      offset:
        searchParams.get("offset") !== null ? parseInt(searchParams.get("offset")!) : undefined,
      q: searchParams.get("q") || undefined,
    },
  });

  const baseQuery = db
    .select()
    .from(locationsTable)
    .where(or(ilike(locationsTable.name, `%${q}%`)));

  if (limit === undefined || offset === undefined) {
    const locations = await baseQuery.orderBy(asc(locationsTable.created_at));
    return NextResponse.json(locations);
  }

  const [data, [count]] = await Promise.all([
    baseQuery.limit(limit).offset(offset),
    db
      .select({ count: sqlCount() })
      .from(locationsTable)
      .where(ilike(locationsTable.name, `%${q}%`)),
  ]);

  return NextResponse.json({
    data,
    ...count,
  });
});
