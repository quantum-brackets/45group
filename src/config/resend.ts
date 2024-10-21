import { CreateEmailOptions, CreateEmailRequestOptions, Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const ONBOARDING_RESEND_EMAIL_SENDER = "45Group <onboarding@zydcode.com>";

export async function sendEmail(
  payload: Omit<CreateEmailOptions, "from">,
  options?: CreateEmailRequestOptions
) {
  const { data, error } = await resend.emails.send(
    {
      from: ONBOARDING_RESEND_EMAIL_SENDER,
      ...payload,
    } as CreateEmailOptions,
    options
  );

  if (error) throw error;

  return data;
}

export default resend;
