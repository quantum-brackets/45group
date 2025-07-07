
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { testLoginAction, verifySessionByIdAction, getSessionTokenByEmailAction } from "@/lib/actions";
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, KeyRound, Database, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";


const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

const loadFormSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type LoadFormValues = z.infer<typeof loadFormSchema>;


interface SessionDebuggerProps {
    initialSessionId?: string;
}

export function SessionDebugger({ initialSessionId }: SessionDebuggerProps) {
  const router = useRouter();
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isVerifyPending, startVerifyTransition] = useTransition();
  const [isLoadPending, startLoadTransition] = useTransition();
  const [loginResult, setLoginResult] = useState<{ success?: string; error?: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ success?: string; error?: string } | null>(null);
  const [loadResult, setLoadResult] = useState<{ success?: string; error?: string } | null>(null);
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loadForm = useForm<LoadFormValues>({
      resolver: zodResolver(loadFormSchema),
      defaultValues: {
          email: "",
      },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
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
        if (result.success) {
            router.refresh();
        }
    });
  }

  const onEmailLoadSubmit = (data: LoadFormValues) => {
    setVerifyResult(null);
    setLoadResult(null);
    startLoadTransition(async () => {
        const result = await getSessionTokenByEmailAction({email: data.email});
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
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="grid gap-4">
              <FormField
                control={loginForm.control}
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
                control={loginForm.control}
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
                <Form {...loadForm}>
                    <form onSubmit={loadForm.handleSubmit(onEmailLoadSubmit)} className="grid gap-4">
                        <FormField
                        control={loadForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Find Session by Email</FormLabel>
                            <FormControl>
                                <Input placeholder="user@example.com" {...field} disabled={isLoadPending} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" variant="outline" className="w-full" disabled={isLoadPending}>
                            {isLoadPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Load Session Token
                        </Button>
                    </form>
                </Form>
                 {loadResult && (
                    <div className="mt-4">
                    {loadResult.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Load Failed</AlertTitle>
                            <AlertDescription>{loadResult.error}</AlertDescription>
                        </Alert>
                    )}
                    {loadResult.success && (
                        <Alert variant="default" className="border-green-500 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Load Succeeded</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Token loaded and placed in the field below.
                            </AlertDescription>
                        </Alert>
                    )}
                    </div>
                )}
                <Separator className="my-2"/>
                <div className="grid gap-2">
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
