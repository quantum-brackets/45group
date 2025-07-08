
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { impersonateUserAction, logoutAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, AlertCircle, LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const impersonationFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
type ImpersonationFormValues = z.infer<typeof impersonationFormSchema>;


export function SessionDebugger({ initialSessionId }: { initialSessionId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ImpersonationFormValues>({
    resolver: zodResolver(impersonationFormSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ImpersonationFormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await impersonateUserAction(data.email);
      if (result?.error) {
        setError(result.error);
      }
      if (result?.success) {
        router.refresh();
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
        await logoutAction();
        router.refresh();
    });
  };

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-6 w-6" />
            Session Debugger
          </CardTitle>
          <CardDescription>
            Impersonate a user by email to debug their session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             {initialSessionId ? (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Current Session ID:</p>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={initialSessionId} className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={handleLogout} disabled={isPending}>
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Logout</span>
                        </Button>
                    </div>
                </div>
             ) : (
                <p className="text-sm text-muted-foreground">No active session.</p>
             )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Impersonation Failed</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Impersonate User</FormLabel>
                        <FormControl>
                            <Input placeholder="user@example.com" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Session
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
  );
}

