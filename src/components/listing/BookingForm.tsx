

"use client";

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { createBookingAction } from '@/lib/actions';
import { EVENT_BOOKING_DAILY_HRS } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';
import type { Listing, Permission, Role, User } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { add, differenceInCalendarDays, isWithinInterval, parseISO } from 'date-fns';
import { Loader2, PartyPopper, Users, Warehouse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { DateRange } from 'react-day-picker';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatDateToStr, toZonedTimeSafe } from '@/lib/utils';


interface BookingFormProps {
  listing: Listing;
  confirmedBookings: { startDate: string, endDate: string, inventoryIds: string[] }[];
  session: User | null;
  allUsers?: User[];
  permissions: Record<Role, Permission[]> | null;
}

const bookingFormSchema = z.object({
  userId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestNotes: z.string().optional(),
});
type BookingFormValues = z.infer<typeof bookingFormSchema>;


export function BookingForm({ listing, confirmedBookings, session, allUsers = [], permissions }: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [units, setUnits] = useState(1);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [bookingFor, setBookingFor] = useState<'self' | 'other'>('self');
  const canBookForOthers = session && hasPermission(permissions, session, 'booking:create');
  const guestUsers = useMemo(() => allUsers.filter(u => u.role === 'guest'), [allUsers]);

  const [availability, setAvailability] = useState({
    availableCount: listing.inventoryCount || 0,
    message: '',
    isChecking: false,
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      userId: session?.id || undefined,
      guestName: '',
      guestEmail: '',
      guestNotes: '',
    },
  });

  useEffect(() => {
    if (session) {
      form.setValue('userId', session.id);
      setBookingFor('self');
    } else {
      form.reset();
    }
  }, [session, form]);

  const handleBookingForChange = (value: 'self' | 'other') => {
    setBookingFor(value);
    form.setValue('userId', undefined);
    form.setValue('guestName', undefined);
    form.setValue('guestEmail', undefined);
    form.setValue('guestNotes', undefined);

    if (value === 'self' && session) {
      form.setValue('userId', session.id);
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
    const eventDayHours = EVENT_BOOKING_DAILY_HRS;;

    switch (listing.price_unit) {
      case 'night':
        calculatedPrice = listing.price * nights * units;
        breakdown = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.price)} x ${nights} night(s) x ${units} unit(s)`;
        break;
      case 'hour':
        calculatedPrice = listing.price * duration * eventDayHours * units;
        breakdown = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency, minimumFractionDigits: 0 }).format(listing.price)} x ${duration * eventDayHours} hours x ${units} unit(s)`;
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
    form.clearErrors();
    if (!date?.from) {
        toast({ title: "Please select dates", variant: "destructive" });
        return;
    }

    // Logged-in user booking for someone else (new or existing)
    if (session && bookingFor === 'other') {
      const selectedUserId = form.getValues('userId');
      const guestName = form.getValues('guestName');

      if (!selectedUserId && !guestName) {
        form.setError('guestName', { message: 'Please select an existing customer or enter a new one by name.' });
        return;
      }

      const guestEmail = form.getValues('guestEmail');
      // If an email is provided for a new guest, validate it.
      if (!selectedUserId && guestName && guestEmail) {
        const emailValidation = z.string().email().safeParse(guestEmail);
        if (!emailValidation.success) {
          form.setError('guestEmail', { message: 'Please enter a valid email.' });
          return;
        }
      }
    } else if (!session) { // Not logged in, guest checkout
      const guestName = form.getValues('guestName');
      const guestEmail = form.getValues('guestEmail');
      let hasError = false;
      if (!guestName) {
        form.setError('guestName', { message: 'Name is required.' });
        hasError = true;
      }
      if (!guestEmail) {
        form.setError('guestEmail', { message: 'Email is required.' });
        hasError = true;
      } else {
        const emailValidation = z.string().email().safeParse(guestEmail);
        if (!emailValidation.success) {
          form.setError('guestEmail', { message: 'Please enter a valid email.' });
          hasError = true;
        }
      }
      if (hasError) return;
    }

    submitBooking();
  };

  const submitBooking = () => {
    startTransition(async () => {
        const formData = form.getValues();
        const startDate = date!.from!;
        let endDate = date!.to;

        // If no end date is selected, apply default duration based on listing type
        if (!endDate) {
          switch (listing.type) {
            case 'hotel':
              endDate = add(startDate, { days: 7 });
              break;
            case 'events':
            case 'restaurant':
              endDate = startDate;
              break;
            default:
              endDate = startDate;
          }
        }

        const result = await createBookingAction({
            listingId: listing.id,
            startDate: toZonedTimeSafe(startDate).toISOString(),
            endDate: toZonedTimeSafe(endDate).toISOString(),
            guests: guests,
            numberOfUnits: units,
            userId: formData.userId,
            guestName: formData.guestName,
            guestEmail: formData.guestEmail,
            guestNotes: formData.guestNotes,
        });

        if (result.success) {
            toast({
                title: "Booking Request Sent!",
                description: result.message,
                action: <div className="p-2 bg-accent rounded-full"><PartyPopper className="h-5 w-5 text-accent-foreground" /></div>,
            });
            setDate(undefined);
            setGuests(1);
            setUnits(1);
            form.reset({
              userId: session?.id || undefined,
              guestName: '',
              guestEmail: '',
              guestNotes: '',
            });
        } else {
            toast({
                title: "Booking Failed",
                description: result.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    });
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
                    <Label className="text-xs font-bold uppercase text-muted-foreground">From</Label>
                    <div className="text-sm mt-1">{date?.from ? formatDateToStr(date.from, 'MM/dd/yyyy') : 'Add date'}</div>
                  </div>
                  <Separator orientation="vertical" className="h-auto" />
                   <div className="flex-1 p-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">To</Label>
                    <div className="text-sm mt-1">{date?.to ? formatDateToStr(date.to, 'MM/dd/yyyy') : 'Add date'}</div>
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="end">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="min-h-5 text-center text-sm mb-2 flex items-center justify-center px-2">
              {availability.message && (
                  <span className={availability.availableCount <= 0 ? 'text-destructive' : 'text-accent'}>
                      {availability.message}
                  </span>
              )}
          </div>

          {canBookForOthers ? (
            <div className="space-y-2 pt-4 border-t">
              <Label>Reserve For</Label>
              <RadioGroup value={bookingFor} onValueChange={handleBookingForChange} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="font-normal">Myself</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal">Someone else</Label>
                </div>
              </RadioGroup>
              {bookingFor === 'other' && (
                <div className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Customer</FormLabel>
                        <FormControl>
                          <Combobox
                            options={guestUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                            value={field.value}
                            onChange={(value) => {
                                field.onChange(value);
                                if (value) {
                                  form.setValue('guestName', undefined);
                                  form.setValue('guestEmail', undefined);
                                  form.setValue('guestNotes', undefined);
                                }
                            }}
                            placeholder="Select an existing customers..."
                            searchPlaceholder="Search customers..."
                            emptyPlaceholder="No customers found."
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-4">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <Separator className="flex-1" />
                  </div>
                   <div className="space-y-2">
                      <FormField
                          control={form.control}
                          name="guestName"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>New Customer <strong className="text-red-500">*</strong></FormLabel>
                              <FormControl>
                                <Input placeholder="Name e.g. John Doe" {...field} onChange={(e) => {
                                    field.onChange(e);
                                    if(e.target.value) { form.setValue('userId', undefined); }
                                }}/>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="guestEmail"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Customer Email</FormLabel>
                              <FormControl>
                                <Input placeholder="guest@example.com" {...field} onChange={(e) => {
                                    field.onChange(e);
                                    if(e.target.value) { form.setValue('userId', undefined); }
                                }}/>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                        control={form.control}
                        name="guestNotes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Booking Notes</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Internal notes about the new customer..." {...field} onChange={(e) => {
                                        field.onChange(e);
                                        if(e.target.value) { form.setValue('userId', undefined); }
                                    }}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                   </div>
                </div>
              )}
            </div>
          ) : !session && (
            <div className="w-full space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-center">Continue as Guest</h3>
              <p className="text-sm text-center text-muted-foreground -mt-2">An account will be created for you to manage this booking.</p>
              <FormField
                control={form.control}
                name="guestName"
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
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="text-center text-sm text-muted-foreground px-4">
                  <br/>
                  <p>You won&apos;t be charged yet.</p>
                  <br/>
                  <p>Payment is required to confirm your booking.</p>
                  <br/>
                  <p>You can also pay in person upon check-in.</p>
              </div>
         </CardFooter>
      </Card>
    </Form>
  );
}
