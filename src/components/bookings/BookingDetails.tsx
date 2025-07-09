
"use client";

import { useState, useTransition } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

import type { Booking, Listing, User } from '@/lib/types';
import { updateBookingAction, cancelBookingAction, confirmBookingAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar as CalendarLucide, Users, Info, Building, Edit, Loader2, User as UserIcon, History, KeySquare, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { BackButton } from '../common/BackButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface BookingDetailsProps {
  booking: Booking;
  listing: Listing;
  session: User;
  totalInventoryCount: number;
}

const formSchema = z.object({
  dates: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }).refine(data => !!data.from, { message: "Start date is required" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function BookingDetails({ booking, listing, session, totalInventoryCount }: BookingDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();

  const { toast } = useToast();
  const router = useRouter();

  const canEdit = session.role === 'admin' || session.id === booking.userId;
  const isActionable = booking.status !== 'Cancelled';
  const canConfirm = session.role === 'admin' && booking.status === 'Pending';
  const canCancel = (session.role === 'admin' || (session.role === 'guest' && session.id === booking.userId)) && isActionable;
  const isAnyActionPending = isUpdatePending || isConfirmPending || isCancelPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dates: {
        from: parseISO(booking.startDate),
        to: parseISO(booking.endDate),
      },
      guests: booking.guests,
      numberOfUnits: booking.inventoryIds.length || 1,
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!data.dates.from) return;

    startUpdateTransition(async () => {
      const result = await updateBookingAction({
        bookingId: booking.id,
        startDate: data.dates.from.toISOString(),
        endDate: (data.dates.to || data.dates.from).toISOString(),
        guests: data.guests,
        numberOfUnits: data.numberOfUnits,
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

  const handleConfirm = () => {
    startConfirmTransition(async () => {
        const result = await confirmBookingAction({ bookingId: booking.id });
        if (result.success) {
            toast({ title: "Booking Confirmed", description: result.success });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleCancel = () => {
      startCancelTransition(async () => {
          const result = await cancelBookingAction({ bookingId: booking.id });
          if (result.success) {
              toast({ title: "Booking Cancelled", description: result.message });
              router.refresh();
          } else {
              toast({ title: "Error", description: result.error, variant: "destructive" });
          }
      });
  };


  const DisplayView = () => (
    <>
        <CardContent className="space-y-6 pt-6 text-base">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
            <CalendarLucide className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
                <p className="font-semibold">Booking Dates</p>
                <p className="text-muted-foreground">
                {format(parseISO(booking.startDate), 'PPP')} to {format(parseISO(booking.endDate), 'PPP')}
                </p>
            </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
            <Users className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
                <p className="font-semibold">Number of Guests</p>
                <p className="text-muted-foreground">{booking.guests}</p>
            </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
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
            {(session.role === 'admin' || session.role === 'staff') && booking.userName && (
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <UserIcon className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                <p className="font-semibold">Booked By</p>
                <p className="text-muted-foreground">
                    <Link href={`/dashboard/edit-user/${booking.userId}`} className="text-primary hover:underline">
                        {booking.userName}
                    </Link>
                    {booking.createdAt && (
                    <span className="block text-sm">on {format(parseISO(booking.createdAt), 'PPP')}</span>
                    )}
                </p>
                </div>
            </div>
            )}
        </div>

        <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
            <KeySquare className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
            <div>
                <p className="font-semibold">{booking.inventoryIds.length} Unit(s) Booked</p>
                <p className="text-muted-foreground text-sm">
                {booking.inventoryNames?.join(', ') || 'N/A'}
                </p>
            </div>
            </div>
            {booking.statusMessage && (
            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <History className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                <p className="font-semibold">Booking History</p>
                <p className="text-muted-foreground">{booking.statusMessage}</p>
                </div>
            </div>
            )}
        </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4 bg-muted/50 p-4 border-t">
            <BackButton />
            <div className="flex flex-wrap justify-end items-center gap-2">
                {canEdit && isActionable && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isAnyActionPending}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                )}
                {canConfirm && (
                    <Button size="sm" onClick={handleConfirm} disabled={isAnyActionPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isConfirmPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Confirm
                    </Button>
                )}
                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isAnyActionPending}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently cancel the booking for {listing.name}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction 
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    onClick={handleCancel} 
                                    disabled={isCancelPending}>
                                    {isCancelPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Cancel Booking
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </CardFooter>
    </>
  );

  const EditView = () => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
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
                                Max {listing.maxGuests} guests per unit.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="numberOfUnits"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Units</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number"
                                    min="1"
                                    max={totalInventoryCount}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {totalInventoryCount} units available.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setIsEditing(false); form.reset(); }} disabled={isUpdatePending}>
                Cancel
                </Button>
                <Button type="submit" disabled={isUpdatePending}>
                {isUpdatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </CardFooter>
        </form>
    </Form>
  );

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">
          <Link href={`/listing/${listing.id}`} className="hover:underline">{listing.name}</Link>
        </CardTitle>
        <CardDescription className="pt-1">
            <span className="font-mono text-muted-foreground break-all">{booking.id}</span>
        </CardDescription>
      </CardHeader>
      
      {isEditing ? <EditView /> : <DisplayView />}
    </Card>
  );
}
