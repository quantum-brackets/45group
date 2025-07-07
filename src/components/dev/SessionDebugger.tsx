
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { testLoginAction, verifySessionByIdAction, getSessionTokenAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, KeyRound, Database, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";


const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface SessionDebuggerProps {
    initialSessionId?: string;
}

export function SessionDebugger({ initialSessionId }: SessionDebuggerProps) {
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isVerifyPending, startVerifyTransition] = useTransition();
  const [isLoadPending, startLoadTransition] = useTransition();
  const [loginResult, setLoginResult] = useState<{ success?: string; error?: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ success?: string; error?: string } | null>(null);
  const [loadResult, setLoadResult] = useState<{ success?: string; error?: string } | null>(null);
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');

  useEffect(() => {
    // This effect ensures the component's state stays in sync with the prop from the server on every render.
    setSessionId(initialSessionId || '');
  }, [initialSessionId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: FormValues) => {
    setLoginResult(null);
    setVerifyResult(null);
    setLoadResult(null);
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
    setLoadResult(null);
    startVerifyTransition(async () => {
        const result = await verifySessionByIdAction(sessionId);
        setVerifyResult(result);
    });
  }

  const handleLoadSession = () => {
    setVerifyResult(null);
    setLoadResult(null);
    startLoadTransition(async () => {
        const result = await getSessionTokenAction();
        setLoadResult(result);
        if(result.success) {
            setSessionId(result.success);
        } else {
            setSessionId('');
        }
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
            Test login credentials or manually verify a session token.
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
                Test Login & Get Token
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
                <Button onClick={handleLoadSession} variant="outline" className="w-full justify-start" disabled={isLoadPending}>
                    {isLoadPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Load Token From Browser Cookie
                </Button>
                 {loadResult && loadResult.error && (
                    <div className="mt-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Load Failed</AlertTitle>
                            <AlertDescription>{loadResult.error}</AlertDescription>
                        </Alert>
                    </div>
                  )}
                <div className="grid gap-2 pt-4">
                  <Label htmlFor="session-id">Session Token</Label>
                  <Input 
                    id="session-id"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Token will appear here after login test or load"
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={handleVerifySession} className="w-full" disabled={isVerifyPending || !sessionId}>
                    {isVerifyPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Database className="mr-2 h-4 w-4" />
                    Verify Session Token in DB & Set Cookie
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
