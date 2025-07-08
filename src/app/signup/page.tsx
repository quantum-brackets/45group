
import { SignupForm } from "@/components/auth/SignupForm";
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
                <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
                <span className="font-headline">Hospitality</span>
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
      <div className="hidden bg-muted lg:block">
        <img
          src="https://placehold.co/1920x1080.png"
          alt="Image"
          width="1920"
          height="1080"
          data-ai-hint="restaurant dining area"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
