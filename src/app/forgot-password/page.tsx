import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-full items-center justify-center py-12 px-4">
      <div className="mx-auto grid w-full max-w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
              <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
            </Link>
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email and we'll send you a link to reset your password.
            </p>
        </div>
        <ForgotPasswordForm />
        <div className="mt-4 text-center text-sm">
          Remember your password?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
