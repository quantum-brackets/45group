
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { testLoginAction, verifySessionAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, KeyRound, DatabaseSearch } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function SessionDebugger() {
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isVerifyPending, startVerifyTransition] = useTransition();
  const [loginResult, setLoginResult] = useState<{ success?: string; error?: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ success?: string; error?: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "admin@45group.org", password: "" },
  });

  const onLoginSubmit = (data: FormValues) => {
    setLoginResult(null);
    setVerifyResult(null);
    startLoginTransition(async () => {
      const result = await testLoginAction(data);
      setLoginResult(result);
    });
  };

  const handleVerifySession = () => {
    setVerifyResult(null);
    startVerifyTransition(async () => {
        const result = await verifySessionAction();
        setVerifyResult(result);
    });
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-6 w-6" />
            Session Debugger
          </CardTitle>
          <CardDescription>
            Step 1: Attempt a login to get a session cookie. Step 2: Verify that the cookie exists in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onLoginSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} disabled={isLoginPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoginPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoginPending}>
                {isLoginPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                1. Test Login & Set Cookie
              </Button>
            </form>
          </Form>

          {loginResult && (
            <div className="mt-4">
              {loginResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Test Failed</AlertTitle>
                  <AlertDescription>{loginResult.error}</AlertDescription>
                </Alert>
              )}
              {loginResult.success && (
                <Alert variant="default" className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Login Test Succeeded</AlertTitle>
                  <AlertDescription className="text-green-700 break-all">
                    <p>Session cookie should be set. Session ID:</p>
                    <p className="font-mono text-xs">{loginResult.success}</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <Separator className="my-4"/>
        <CardContent>
            <div className="grid gap-4">
                <Button onClick={handleVerifySession} className="w-full" disabled={isVerifyPending}>
                    {isVerifyPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <DatabaseSearch className="mr-2 h-4 w-4" />
                    2. Verify Session in DB
                </Button>
                {verifyResult && (
                    <div className="mt-4">
                    {verifyResult.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Verification Failed</AlertTitle>
                            <AlertDescription>{verifyResult.error}</AlertDescription>
                        </Alert>
                    )}
                    {verifyResult.success && (
                        <Alert variant="default" className="border-green-500 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Verification Succeeded</AlertTitle>
                            <AlertDescription className="text-green-700 break-all">
                                {verifyResult.success}
                            </AlertDescription>
                        </Alert>
                    )}
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
  );
}
