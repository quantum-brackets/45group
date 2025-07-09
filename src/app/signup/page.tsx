
import { SignupForm } from "@/components/auth/SignupForm";
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="flex h-full items-center justify-center py-12 px-4">
       <div className="mx-auto grid w-full max-w-[350px] gap-6">
        <div className="grid gap-2 text-center">
           <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
              <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
            </Link>
        </div>
        <SignupForm />
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
