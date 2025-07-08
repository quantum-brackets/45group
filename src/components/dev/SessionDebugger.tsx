
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound } from "lucide-react";


const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;


export function SessionDebugger() {
  const router = useRouter();
  const [isLoginPending, startLoginTransition] = useTransition();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // NOTE: This component's functionality is heavily reduced after Supabase integration.
  // It no longer directly interacts with sessions but can be used for password resets.
  // The 'SetPasswordForm' is now the primary tool here.

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-6 w-6" />
            Developer Tools
          </CardTitle>
          <CardDescription>
            Use the form below to set a new password for any user in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* The core session debugging logic was tied to the old session model. */}
            {/* It is removed as Supabase handles sessions automatically. */}
            <p className="text-sm text-muted-foreground">
                Session debugging is now managed by Supabase. Use the Supabase dashboard to inspect users and sessions.
            </p>
        </CardContent>
      </Card>
  );
}

