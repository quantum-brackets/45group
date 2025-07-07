
import { LoginForm } from "@/components/auth/LoginForm";
import { Mountain } from "lucide-react";
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-4">
                <Mountain className="h-8 w-8 text-primary" />
                <span className="font-headline">Book45</span>
              </Link>
          </div>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
           <div className="mt-4 text-center text-sm">
            Troubleshooting?{" "}
            <Link href="/dev-tools" className="underline">
              Developer Tools
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
          data-ai-hint="modern hotel lobby"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
