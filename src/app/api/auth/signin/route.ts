import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { users } from "~/db/schema";
import catchAsync from "~/utils/catch-async";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const schema = Yup.object({
    email: Yup.string().email("Invalid email address").required("Email is required"),
  });
  const { email } = await schema.validate({ ...body }, { abortEarly: false, stripUnknown: true });

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (user) {
    return NextResponse.json(
      {
        success: false,
        message: "Email already exist",
      },
      {
        status: 400,
      }
    );
  }

  await db.insert(users).values({ email });

  return NextResponse.json({
    success: true,
    message: "User created successfully",
  });
});
