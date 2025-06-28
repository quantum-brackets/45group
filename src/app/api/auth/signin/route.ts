import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import catchAsync from "~/utils/catch-async";
import { usersTable } from "~/db/schemas/users";
import { validateSchema } from "~/utils/helpers";
import WelcomeTemplate from "~/emails/welcome";
import { sendEmail } from "~/config/resend";

export const POST = catchAsync(async (req: NextRequest) => {
  const body = await req.json();

  const { email } = await validateSchema<{ email: string }>({
    object: {
      email: Yup.string().email("Invalid email address").required("Email is required"),
    },
    data: body,
  });

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!existingUser) {
    await db.insert(usersTable).values({ email });
  }

  const currentTime = new Date();

  await db
    .update(usersTable)
    .set({ last_login_at: currentTime, is_verified: !existingUser?.is_verified ? true : undefined })
    .where(eq(usersTable.email, email));

  if (!existingUser?.last_login_at) {
    await sendEmail({
      to: email,
      subject: "Welcome to 45Group",
      react: WelcomeTemplate({
        previewText:
          "We're excited to have you join our platform where you can discover and book the finest lodges, events, and...",
      }),
    });
  }

  return NextResponse.json({
    message: "User signed in successfully",
  });
});
