
"use client";

import { useState, useTransition } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

import type { Booking, Listing, User } from '@/lib/types';
import { updateBookingAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar as CalendarLucide, Users, Info, Building, Edit, Loader2, User as UserIcon, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface BookingDetailsProps {
  booking: Booking;
  listing: Listing;
  session: User;
}

const formSchema = z.object({
  dates: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }).refine(data => !!data.from, { message: "Start date is required" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function BookingDetails({ booking, listing, session }: BookingDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const canEdit = session.role === 'admin' || session.id === booking.userId;
  const isActionable = booking.status !== 'Cancelled';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dates: {
        from: parseISO(booking.startDate),
        to: parseISO(booking.endDate),
      },
      guests: booking.guests,
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!data.dates.from) return;

    startTransition(async () => {
      const result = await updateBookingAction({
        bookingId: booking.id,
        startDate: data.dates.from.toISOString(),
        endDate: (data.dates.to || data.dates.from).toISOString(),
        guests: data.guests,
      });

      if (result.success) {
        toast({
          title: "Booking Updated!",
          description: result.message,
        });
        setIsEditing(false);
        router.refresh(); 
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const DisplayView = () => (
    <CardContent className="grid md:grid-cols-2 gap-6 text-base">
      <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
        <CalendarLucide className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
        <div>
          <p className="font-semibold">Booking Dates</p>
          <p className="text-muted-foreground">
            {format(parseISO(booking.startDate), 'PPP')} to {format(parseISO(booking.endDate), 'PPP')}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
        <Users className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
        <div>
          <p className="font-semibold">Number of Guests</p>
          <p className="text-muted-foreground">{booking.guests}</p>
        </div>
      </div>
      <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
        <Info className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
        <div>
          <p className="font-semibold">Status</p>
          <p>
            <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
              {booking.status}
            </Badge>
          </p>
        </div>
      </div>
      {session.role === 'admin' && booking.userName && (
        <div className="flex items-start gap-4 p-4 bg-card rounded-lg border">
          <UserIcon className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold">Booked By</p>
            <p className="text-muted-foreground">
              {booking.userName}
              {booking.createdAt && (
                <span className="block text-sm">on {format(parseISO(booking.createdAt), 'PPP')}</span>
              )}
            </p>
          </div>
        </div>
      )}
       {booking.statusMessage && (
        <div className="md:col-span-2 flex items-start gap-4 p-4 bg-card rounded-lg border">
          <History className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
          <div>
            <p className="font-semibold">Booking History</p>
            <p className="text-muted-foreground">{booking.statusMessage}</p>
          </div>
        </div>
      )}
    </CardContent>
  );

  const EditView = () => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid md:grid-cols-2 gap-6">
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
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarLucide className="mr-2 h-4 w-4" />
                                {field.value?.from ? (
                                field.value.to ? (
                                    <>
                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                    {format(field.value.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(field.value.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange as (date: DateRange | undefined) => void}
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
                
                <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Guests</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number"
                                    min="1"
                                    max={listing.maxGuests}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {listing.maxGuests} guests.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setIsEditing(false); form.reset(); }} disabled={isPending}>
                Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </CardFooter>
        </form>
    </Form>
  );

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-headline text-primary">
            <Link href={`/listing/${listing.id}`} className="hover:underline">{listing.name}</Link>
          </CardTitle>
          <CardDescription className="pt-1">
              <span className="font-mono text-muted-foreground">{booking.id}</span>
          </CardDescription>
        </div>
        {canEdit && !isEditing && isActionable && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Booking
            </Button>
        )}
      </CardHeader>
      
      {isEditing ? <EditView /> : <DisplayView />}
      
      {!isEditing && (
          <CardFooter className="flex justify-end">
              <Button asChild>
                  <Link href="/bookings">Back to Bookings</Link>
              </Button>
          </CardFooter>
      )}
    </Card>
  );
}
