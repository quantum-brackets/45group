
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { updatePasswordAction, verifyLoginAction } from "@/lib/actions";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "New password must be at least 6 characters."),
  verifyPassword: z.string()
}).refine((data) => data.password === data.verifyPassword, {
  message: "Passwords do not match.",
  path: ["verifyPassword"],
});


type FormValues = z.infer<typeof formSchema>;

export function SetPasswordForm() {
  const [isUpdating, startUpdateTransition] = useTransition();
  const [updateStatus, setUpdateStatus] = useState<{success?: string; error?: string} | null>(null);
  
  const [isVerifying, startVerificationTransition] = useTransition();
  const [verificationStatus, setVerificationStatus] = useState<{success?: string; error?: string} | null>(null);
  const [credentialsToVerify, setCredentialsToVerify] = useState<Pick<FormValues, 'email' | 'password'> | null>(null);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      verifyPassword: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    setUpdateStatus(null);
    setVerificationStatus(null);
    setCredentialsToVerify(null);

    startUpdateTransition(async () => {
      const result = await updatePasswordAction({email: data.email, password: data.password});
      if (result?.error) {
        setUpdateStatus({ error: result.error });
      }
      if (result?.success) {
        setUpdateStatus({ success: result.success })
        setCredentialsToVerify({ email: data.email, password: data.password });
        form.reset();
      }
    });
  };

  const handleVerify = () => {
    if (!credentialsToVerify) return;
    setVerificationStatus(null);
    startVerificationTransition(async () => {
      const result = await verifyLoginAction(credentialsToVerify);
      setVerificationStatus(result);
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {updateStatus?.error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{updateStatus.error}</AlertDescription>
            </Alert>
        )}
        {updateStatus?.success && (
            <Alert variant="default" className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{updateStatus.success}</AlertDescription>
            </Alert>
        )}
        {verificationStatus?.error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Failed</AlertTitle>
                <AlertDescription>{verificationStatus.error}</AlertDescription>
            </Alert>
        )}
        {verificationStatus?.success && (
            <Alert variant="default" className="border-accent bg-accent/10">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <AlertTitle className="text-accent/90 font-bold">Verification Succeeded</AlertTitle>
                <AlertDescription className="text-accent/90">{verificationStatus.success}</AlertDescription>
            </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} disabled={isUpdating || isVerifying} />
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
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} disabled={isUpdating || isVerifying} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="verifyPassword"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Verify Password</FormLabel>
                    <FormControl>
                        <Input type="password" {...field} disabled={isUpdating || isVerifying} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full" disabled={isUpdating || isVerifying}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Password
            </Button>
            <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleVerify}
                disabled={isVerifying || !credentialsToVerify}
            >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Login
            </Button>
        </div>
      </form>
    </Form>
  );
}
