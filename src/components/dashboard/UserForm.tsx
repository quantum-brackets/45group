
"use client";

import React from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addUserAction, updateUserAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "../ui/textarea";
import { BackButton } from "../common/BackButton";

const baseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  role: z.enum(['admin', 'guest', 'staff'], { required_error: "Role is required."}),
  status: z.enum(['active', 'disabled', 'provisional'], { required_error: "Status is required."}),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// Create different schemas for add vs edit, especially for the email field.
const addUserSchema = baseSchema.extend({
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
});

const editUserSchema = baseSchema.extend({
  email: z.string().email("A valid email is required and cannot be removed."),
});


interface UserFormProps {
  user?: User; // If user is provided, we are in "edit" mode
  session: User;
}

export function UserForm({ user, session }: UserFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!user;

  // Choose the right schema based on whether we are adding or editing a user.
  const formSchema = isEditMode ? editUserSchema : addUserSchema;
  type FormValues = z.infer<typeof formSchema>;

  // Staff can only create users, not edit them. When creating, lock role to 'guest'.
  const lockRoleForStaff = !isEditMode && session.role === 'staff';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || 'guest',
      status: user ? user.status : 'provisional',
      phone: user?.phone || "",
      notes: user?.notes || "",
    },
  });

  const watchEmail = form.watch('email');
  const watchPassword = form.watch('password');
  const isProvisionalLocked = !isEditMode && (!watchEmail || !watchPassword);

  React.useEffect(() => {
    if (lockRoleForStaff) {
        form.setValue('role', 'guest');
    }
  }, [lockRoleForStaff, form]);
  
  React.useEffect(() => {
    if (isProvisionalLocked) {
      form.setValue('status', 'provisional');
    }
  }, [isProvisionalLocked, form]);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    startTransition(async () => {
      if (!isEditMode && !data.password && data.email) {
          form.setError("password", { type: "manual", message: "Password is required if an email is provided." });
          return;
      }
        
      const result = isEditMode
        ? await updateUserAction(user!.id, data)
        : await addUserAction(data);

      if (result.success) {
        // Only show toast if changes were actually made (for edits), or for new users.
        const wasNotAnUnchangedUpdate = !('changesMade' in result && result.changesMade === false);
        
        if (wasNotAnUnchangedUpdate) {
          toast({
            title: `User ${isEditMode ? 'Updated' : 'Added'} Successfully!`,
            description: result.message,
          });
        }
        router.push('/dashboard?tab=users');
      } else {
        toast({
          title: `Error ${isEditMode ? 'adding' : 'updating'} user`,
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit User' : 'Add New User'}</CardTitle>
            <CardDescription>
              {isEditMode ? `Update the details for ${user.name}.` : 'Create a new user account.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                   <FormDescription>
                    {isEditMode ? "The user's email address (cannot be removed)." : "Optional. If provided, a password is also required."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 555-5555" {...field} />
                  </FormControl>
                  <FormDescription>
                    Include country code if applicable.
                  </FormDescription>
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
                    <Input type="password" {...field} />
                  </FormControl>
                   <FormDescription>
                    {isEditMode ? "Leave blank to keep the current password." : "Optional, but required if email is provided. Minimum 6 characters."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={lockRoleForStaff}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a user role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {session.role === 'admin' ? (
                                <>
                                    <SelectItem value="guest">Guest</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </>
                            ) : (
                                <SelectItem value="guest">Guest</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {lockRoleForStaff && (
                        <FormDescription>Staff can only create Guest accounts.</FormDescription>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
             />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Account Status</FormLabel>
                    <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex items-center space-x-4"
                          disabled={isProvisionalLocked}
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="active" />
                            </FormControl>
                            <FormLabel className="font-normal">Active</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="disabled" />
                            </FormControl>
                            <FormLabel className="font-normal">Disabled</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="provisional" />
                            </FormControl>
                            <FormLabel className="font-normal">Provisional</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                     {isProvisionalLocked && (
                        <FormDescription>Status is locked to 'Provisional' unless an email and password are provided.</FormDescription>
                    )}
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                          <Textarea
                              placeholder="Internal notes about the user..."
                              rows={4}
                              {...field}
                          />
                      </FormControl>
                      <FormDescription>
                          These notes are visible to other administrators and the user themselves.
                      </FormDescription>
                      <FormMessage />
                  </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <BackButton disabled={isPending} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Create User'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
