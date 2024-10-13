import { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  payload: Omit<CreateEmailOptions, "from">,
  options?: CreateEmailRequestOptions
) {
  if (!process.env.ONBOARDING_RESEND_EMAIL_SENDER)
    throw new Error("Resend `from` option not added");

  const { data, error } = await resend.emails.send(
    {
      from: process.env.ONBOARDING_RESEND_EMAIL_SENDER,
      ...payload,
    } as CreateEmailOptions,
    options
  );

  if (error) throw error;

  return data;
}

export default resend;
