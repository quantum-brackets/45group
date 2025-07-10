
"use client";

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"
import type { Listing, User } from '@/lib/types';
import { Loader2, PartyPopper, Users, Warehouse } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, parseISO, differenceInCalendarDays } from 'date-fns';
import { createBookingAction } from '@/lib/actions';
import { Separator } from '../ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Combobox } from '../ui/combobox';


interface BookingFormProps {
  listing: Listing;
  confirmedBookings: { startDate: string, endDate: string, inventoryIds: string[] }[];
  session: User | null;
  allUsers?: User[];
}

const bookingFormSchema = z.object({
  bookingName: z.string().min(1, 'Booking name is required.').optional(),
  guestEmail: z.string().email("Please provide a valid email address.").optional(),
  userId: z.string().optional(),
});


export function BookingForm({ listing, confirmedBookings, session, allUsers = [] }: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [units, setUnits] = useState(1);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showGuestEmailDialog, setShowGuestEmailDialog] = useState(false);

  const [bookingFor, setBookingFor] = useState<'self' | 'other'>('self');
  const isAdminOrStaff = session && (session.role === 'admin' || session.role === 'staff');
  const guestUsers = useMemo(() => allUsers.filter(u => u.role === 'guest'), [allUsers]);

  const [availability, setAvailability] = useState({
    availableCount: listing.inventoryCount || 0,
    message: '',
    isChecking: false,
  });

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      bookingName: session?.name || "",
      guestEmail: "",
      userId: session?.id || undefined,
    },
  });
  
  useEffect(() => {
    if (session) {
      form.setValue('userId', session.id);
      if (session.name) form.setValue('bookingName', session.name);
      setBookingFor('self');
    } else {
      form.reset();
    }
  }, [session, form]);

  const handleBookingForChange = (value: 'self' | 'other') => {
    setBookingFor(value);
    if (value === 'self' && session) {
      form.setValue('userId', session.id);
    } else {
      form.setValue('userId', undefined);
    }
  };

  useEffect(() => {
    if (!date?.from) {
      setAvailability({
        availableCount: listing.inventoryCount || 0,
        message: '',
        isChecking: false
      });
      setTotalPrice(null);
      setPriceBreakdown(null);
      setUnits(1);
      return;
    }

    setAvailability(prev => ({ ...prev, isChecking: true, message: 'Checking availability...' }));

    const checkRange = {
      start: date.from,
      end: date.to || date.from,
    };

    const bookedUnits = new Set<string>();

    for (const booking of confirmedBookings) {
      const bookingRange = {
        start: parseISO(booking.startDate),
        end: parseISO(booking.endDate),
      };

      if (
        isWithinInterval(checkRange.start, bookingRange) ||
        isWithinInterval(checkRange.end, bookingRange) ||
        isWithinInterval(bookingRange.start, checkRange) ||
        isWithinInterval(bookingRange.end, checkRange)
      ) {
        booking.inventoryIds.forEach(id => bookedUnits.add(id));
      }
    }
    
    const totalInventory = listing.inventoryCount || 0;
    const availableCount = totalInventory - bookedUnits.size;

    setTimeout(() => {
        setAvailability({
          availableCount,
          message: availableCount <= 0 ? 'No units available for the selected dates.' : `${availableCount} unit(s) available.`,
          isChecking: false,
        });
        if (units > availableCount) {
          setUnits(availableCount > 0 ? availableCount : 1);
        }
    }, 300);

  }, [date, confirmedBookings, listing.inventoryCount, units]);

  useEffect(() => {
    if (!date?.from || !listing.price) {
      setTotalPrice(null);
      setPriceBreakdown(null);
      return;
    }

    let duration = 1;
    if (date.to) {
      duration = differenceInCalendarDays(date.to, date.from) + 1;
    }
    
    let calculatedPrice = 0;
    let breakdown = "";
    
    const nights = duration > 1 ? duration - 1 : 1;

    switch (listing.price_unit) {
      case 'night':
        calculatedPrice = listing.price * nights * units;
        breakdown = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.price)} x ${nights} night(s) x ${units} unit(s)`;
        break;
      case 'hour':
        calculatedPrice = listing.price * duration * 8 * units;
        breakdown = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.price)} x ${duration * 8} hours x ${units} unit(s)`;
        break;
      case 'person':
        calculatedPrice = listing.price * guests * units;
        breakdown = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.price)} x ${guests} guest(s) x ${units} unit(s)`;
        break;
    }
    
    setTotalPrice(calculatedPrice);
    setPriceBreakdown(breakdown);

  }, [date, guests, units, listing]);


  const handleBooking = () => {
    if (!date?.from) {
        toast({ title: "Please select dates", variant: "destructive" });
        return;
    }
    
    if (session) {
      if (bookingFor === 'other' && !form.getValues('userId')) {
        form.setError('userId', { message: 'Please select a guest to book for.' });
        return;
      }
      submitBooking();
    } else {
      if (!form.getValues('bookingName')) {
        form.setError('bookingName', { message: 'Booking name is required for guest bookings.' });
        return;
      }
      setShowGuestEmailDialog(true);
    }
  };

  const submitBooking = (guestInfo?: { email: string, name: string }) => {
    startTransition(async () => {
        const result = await createBookingAction({
            listingId: listing.id,
            startDate: date!.from!.toISOString(),
            endDate: (date!.to || date!.from)!.toISOString(),
            guests: guests,
            numberOfUnits: units,
            userId: session ? form.getValues('userId') : undefined,
            guestEmail: guestInfo?.email,
            bookingName: guestInfo?.name,
        });
        
        if (result.success) {
            toast({
                title: "Booking Request Sent!",
                description: result.message,
                action: <div className="p-2 bg-accent rounded-full"><PartyPopper className="h-5 w-5 text-accent-foreground" /></div>,
            });
            setShowGuestEmailDialog(false);
            if (!session) {
                form.reset({ bookingName: '', guestEmail: ''});
            }
            setDate(undefined);
            setGuests(1);
            setUnits(1);
        } else {
            toast({
                title: "Booking Failed",
                description: result.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    });
  }

  const handleGuestEmailSubmit = (data: z.infer<typeof bookingFormSchema>) => {
      if (!data.guestEmail) {
          form.setError('guestEmail', { message: 'Email is required to continue.' });
          return;
      }
      if (!data.bookingName) {
        form.setError('bookingName', { message: 'Booking name is required.' });
        return;
      }
      submitBooking({ email: data.guestEmail, name: data.bookingName });
  }


  const isBookable = !isPending && date?.from && availability.availableCount > 0 && !availability.isChecking && units > 0 && units <= availability.availableCount;

  return (
    <Form {...form}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            <span className="text-xl font-bold text-primary">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency || 'NGN', minimumFractionDigits: 0 }).format(listing.price)}
            </span>
            <span className="text-base font-normal text-muted-foreground">/{listing.price_unit}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="w-full rounded-lg border text-left font-normal hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                aria-label="Select booking dates"
              >
                <div className="flex">
                  <div className="flex-1 p-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Check-in</Label>
                    <div className="text-sm mt-1">{date?.from ? format(date.from, 'MM/dd/yyyy') : 'Add date'}</div>
                  </div>
                  <Separator orientation="vertical" className="h-auto" />
                   <div className="flex-1 p-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Check-out</Label>
                    <div className="text-sm mt-1">{date?.to ? format(date.to, 'MM/dd/yyyy') : 'Add date'}</div>
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                className="rounded-md"
                disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guests" className="font-semibold">Guests</Label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guests"
                  type="number"
                  min="1"
                  max={listing.max_guests * units}
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value, 10) || 1)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="units" className="font-semibold">Units</Label>
               <div className="relative mt-1">
                <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="units"
                  type="number"
                  min="1"
                  max={availability.availableCount > 0 ? availability.availableCount : 1}
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value, 10) || 1)}
                  className="pl-9"
                  disabled={!date?.from || availability.availableCount <= 0}
                />
               </div>
            </div>
          </div>
          
          {!session && (
            <div>
                <Label htmlFor="bookingName" className="font-semibold">Booking Name</Label>
                <FormField
                  control={form.control}
                  name="bookingName"
                  render={({ field }) => (
                    <FormItem className="mt-1">
                      <FormControl>
                        <Input id="bookingName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
          )}

          <div className="min-h-5 text-center text-sm mb-2 flex items-center justify-center px-2">
              {availability.message && (
                  <span className={availability.availableCount <= 0 ? 'text-destructive' : 'text-accent'}>
                      {availability.message}
                  </span>
              )}
          </div>
          
          {isAdminOrStaff && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Book For</Label>
              <RadioGroup value={bookingFor} onValueChange={handleBookingForChange} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="font-normal">Myself</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal">Another Guest</Label>
                </div>
              </RadioGroup>
              {bookingFor === 'other' && (
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Combobox
                          options={guestUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a guest..."
                          searchPlaceholder="Search guests..."
                          emptyPlaceholder="No guests found."
                          className="w-full mt-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          {totalPrice !== null && priceBreakdown && (
              <div className="space-y-2 text-sm pt-4 border-t">
                  <div className="flex justify-between">
                      <p className="text-muted-foreground underline decoration-dashed cursor-help" title={priceBreakdown}>Price breakdown</p>
                      <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency }).format(totalPrice)}</span>
                  </div>
                   <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency }).format(totalPrice)}</span>
                  </div>
              </div>
          )}
        </CardContent>

         <CardFooter className="flex-col items-stretch space-y-2">
              <Button 
                  onClick={handleBooking} 
                  disabled={!isBookable}
                  className="w-full text-lg" 
                  size="lg">
                  {isPending || availability.isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request to Book"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                  You won't be charged yet
              </div>
         </CardFooter>
      </Card>
      <Dialog open={showGuestEmailDialog} onOpenChange={setShowGuestEmailDialog}>
          <form onSubmit={form.handleSubmit(handleGuestEmailSubmit)}>
               <DialogHeader>
                  <DialogTitle>Continue as Guest</DialogTitle>
                  <DialogDescription>
                      To complete your booking, please enter your email address. An account will be created for you if one doesn't exist.
                  </DialogDescription>
              </DialogHeader>
              <DialogContent>
                  <div className="space-y-4 py-4">
                      <FormField
                          control={form.control}
                          name="guestEmail"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                      <Input placeholder="user@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
              </DialogContent>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setShowGuestEmailDialog(false)} disabled={isPending}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Booking
                  </Button>
              </DialogFooter>
          </form>
      </Dialog>
    </Form>
  );
}
