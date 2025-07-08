
import { LoginForm } from "@/components/auth/LoginForm";
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center py-12">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
              <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
              <span className="font-headline">Hospitality</span>
            </Link>
        </div>
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
