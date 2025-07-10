import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createSupabaseAdminClient } from "@/lib/supabase";
import Link from 'next/link';
import { notFound } from "next/navigation";

interface ResetPasswordPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

async function validateToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('users')
    .select('id, data')
    .eq('data->>password_reset_token', token)
    .single();

  if (error || !data || !data.data.password_reset_token) {
    return false;
  }
  
  const expires = data.data.password_reset_expires as number;
  if (!expires || Date.now() > expires) {
    return false;
  }

  return true;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';

  if (!token || !(await validateToken(token))) {
    notFound();
  }

  return (
    <div className="flex h-full items-center justify-center py-12 px-4">
      <div className="mx-auto grid w-full max-w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
              <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
            </Link>
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="text-balance text-muted-foreground">
              Enter your new password below.
            </p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
