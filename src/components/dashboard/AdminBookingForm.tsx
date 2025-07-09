
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Listing, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addBookingByAdminAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, UserPlus, Users, Warehouse, Building } from "lucide-react";
import { BackButton } from "../common/BackButton";
import { Combobox } from "../ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Switch } from "../ui/switch";

const formSchema = z.object({
  listingId: z.string().min(1, 'Please select a venue.'),
  userId: z.string().optional(),
  isNewUser: z.boolean().optional(),
  newUserName: z.string().optional(),
  newUserEmail: z.string().optional(),
  dates: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }).refine(data => !!data.from, { message: "Start date is required" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
}).refine(data => {
  return data.isNewUser ? data.newUserName && data.newUserEmail : data.userId;
}, {
  message: "Either select an existing user or provide details for a new user.",
  path: ['userId'],
}).refine(data => {
  return !data.isNewUser || (data.isNewUser && z.string().email().safeParse(data.newUserEmail).success);
}, {
  message: "A valid email is required for new users.",
  path: ['newUserEmail'],
});

type FormValues = z.infer<typeof formSchema>;

interface AdminBookingFormProps {
  listings: Listing[];
  users: User[];
}

export function AdminBookingForm({ listings, users }: AdminBookingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNewUser, setIsNewUser] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        listingId: '',
        userId: '',
        isNewUser: false,
        newUserName: '',
        newUserEmail: '',
        dates: { from: undefined, to: undefined },
        guests: 1,
        numberOfUnits: 1,
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    startTransition(async () => {
      const result = await addBookingByAdminAction(data);
      if (result.success) {
        toast({
          title: "Booking Created Successfully!",
          description: result.message,
        });
      } else {
        toast({
          title: "Error creating booking",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const listingOptions = listings.map(l => ({ label: l.name, value: l.id }));
  const userOptions = users.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));

  const selectedListing = listings.find(l => l.id === form.watch('listingId'));

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Add New Booking</CardTitle>
            <CardDescription>Create a booking on behalf of a user.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <FormField
                    control={form.control}
                    name="listingId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Venue / Listing</FormLabel>
                             <FormControl>
                                <Combobox
                                    options={listingOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select a venue"
                                    searchPlaceholder="Search venues..."
                                    emptyPlaceholder="No venues found."
                                    className="w-full"
                                />
                             </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="md:col-span-2 space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                    <FormLabel>User Information</FormLabel>
                     <div className="flex items-center space-x-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <FormField
                            control={form.control}
                            name="isNewUser"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                setIsNewUser(checked);
                                                if (checked) {
                                                    form.setValue('userId', undefined);
                                                } else {
                                                    form.setValue('newUserName', '');
                                                    form.setValue('newUserEmail', '');
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">Create New User</FormLabel>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                {isNewUser ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="newUserName" render={({ field }) => (
                            <FormItem><FormLabel>New User Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="newUserEmail" render={({ field }) => (
                            <FormItem><FormLabel>New User Email</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                            <FormItem>
                                 <FormControl>
                                    <Combobox
                                        options={userOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select an existing user"
                                        searchPlaceholder="Search users..."
                                        emptyPlaceholder="No users found."
                                        className="w-full"
                                    />
                                 </FormControl>
                                 <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
           
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="dates"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Booking Dates</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={field.value as DateRange}
                          onSelect={field.onChange}
                          numberOfMonths={2}
                          disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField control={form.control} name="guests" render={({ field }) => (
                <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl><Input type="number" min="1" max={selectedListing?.max_guests} {...field} /></FormControl>
                    {selectedListing && <FormDescription>Max {selectedListing.max_guests} guests.</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="numberOfUnits" render={({ field }) => (
                <FormItem>
                    <FormLabel>Number of Units</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>

          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <BackButton disabled={isPending} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Booking
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
