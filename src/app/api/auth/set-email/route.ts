import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import * as Yup from "yup";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import catchAsync from "~/utils/catch-async";
import { appError, validateSchema } from "~/utils/helpers";
import { sendEmail } from "~/config/resend";
import EmailChangeConfirmation from "~/emails/email-change-confirmation";
import { HEADER_DATA_KEY } from "~/utils/constants";

export const POST = catchAsync(async (req: NextRequest) => {
  const userId = req.headers.get(HEADER_DATA_KEY) as string;
  const body = await req.json();

  const { new_email } = await validateSchema({
    object: {
      new_email: Yup.string().email("Invalid new email address").required("New email is required"),
    },
    data: body,
  });

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, new_email));

  if (existingUser) {
    return appError({
      status: 400,
      error: "The new email is already in use.",
    });
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({ email: new_email })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updatedUser) {
    return appError({
      status: 404,
      error: "No user found.",
    });
  }

  await sendEmail({
    to: new_email,
    subject: "Your email address has been updated successfully!",
    react: EmailChangeConfirmation({
      previewText:
        "Your email address was updated successfully. Contact us if you didn't make this change.",
    }),
  });

  return NextResponse.json(updatedUser);
});
