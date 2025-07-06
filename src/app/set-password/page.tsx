
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';
import { ShieldQuestion } from 'lucide-react';
import Link from 'next/link';

export default function SetPasswordPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4">
                <ShieldQuestion className="h-10 w-10 text-primary" />
             </div>
            <h1 className="text-3xl font-bold">Set New Password</h1>
            <p className="text-balance text-muted-foreground">
              This is a temporary troubleshooting tool. Enter a user's email and a new password.
            </p>
          </div>
          <SetPasswordForm />
           <div className="mt-4 text-center text-sm">
            Remember the password?{" "}
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
          data-ai-hint="secure data center"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
