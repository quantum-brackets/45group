
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { testLoginAction, verifySessionByIdAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, KeyRound, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";


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
  const [sessionId, setSessionId] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "admin@45group.org", password: "" },
  });

  const onLoginSubmit = (data: FormValues) => {
    setLoginResult(null);
    setVerifyResult(null);
    setSessionId('');
    startLoginTransition(async () => {
      const result = await testLoginAction(data);
      setLoginResult(result);
      if (result.success) {
        setSessionId(result.success);
      }
    });
  };

  const handleVerifySession = () => {
    setVerifyResult(null);
    startVerifyTransition(async () => {
        const result = await verifySessionByIdAction(sessionId);
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
            Step 1: Test login to generate a session token. Step 2: Verify that token exists in the database.
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
                1. Test Login & Get Token
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
                    <p>Session token generated. It should appear in the field below.</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <Separator className="my-4"/>
        <CardContent>
            <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="session-id">Session Token</Label>
                  <Input 
                    id="session-id"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Token will appear here after login test"
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={handleVerifySession} className="w-full" disabled={isVerifyPending || !sessionId}>
                    {isVerifyPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Database className="mr-2 h-4 w-4" />
                    2. Verify Session Token in DB
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
