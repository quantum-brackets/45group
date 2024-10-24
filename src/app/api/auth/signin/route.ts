import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { appError } from "~/utils/helpers";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
  });
  const { email } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (user) {
    return appError({
      error: "Email already exist",
      status: 400,
    });
  }

  await db.insert(usersTable).values({ email });

  return NextResponse.json({
    message: "User created successfully",
  });
});
