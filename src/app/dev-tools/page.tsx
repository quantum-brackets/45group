
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';
import { Wrench } from 'lucide-react';
import Link from 'next/link';
import { SessionDebugger } from '@/components/dev/SessionDebugger';

export default function DevToolsPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4">
                <Wrench className="h-10 w-10 text-primary" />
             </div>
            <h1 className="text-3xl font-bold">Developer Tools</h1>
            <p className="text-balance text-muted-foreground">
              Use these tools for troubleshooting and development purposes.
            </p>
          </div>
          <SetPasswordForm />
          <SessionDebugger />
           <div className="mt-4 text-center text-sm">
            Finished troubleshooting?{" "}
            <Link href="/login" className="underline">
              Return to Login
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
          data-ai-hint="developer command center"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
