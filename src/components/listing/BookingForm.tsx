
"use client";

import { useState, useTransition, useEffect } from 'react';
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


interface BookingFormProps {
  listing: Listing;
  confirmedBookings: { startDate: string, endDate: string, inventoryIds: string[] }[];
  session: User | null;
}

const guestEmailSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
});


export function BookingForm({ listing, confirmedBookings, session }: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [units, setUnits] = useState(1);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [showGuestEmailDialog, setShowGuestEmailDialog] = useState(false);

  const [availability, setAvailability] = useState({
    availableCount: listing.inventoryCount || 0,
    message: '',
    isChecking: false,
  });

  const guestForm = useForm<z.infer<typeof guestEmailSchema>>({
    resolver: zodResolver(guestEmailSchema),
    defaultValues: {
      email: "",
    },
  });

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
    
    // For 'night' based pricing, duration is nights, not days.
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
        toast({
            title: "Please select dates",
            description: "You must select a start and end date for your booking.",
            variant: "destructive",
        });
        return;
    }

    if (session) {
      startTransition(async () => {
          const result = await createBookingAction({
              listingId: listing.id,
              startDate: date.from!.toISOString(),
              endDate: (date.to || date.from)!.toISOString(),
              guests: guests,
              numberOfUnits: units,
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
          } else {
              toast({
                  title: "Booking Failed",
                  description: result.message || "An unexpected error occurred.",
                  variant: "destructive",
              });
          }
      });
    } else {
      setShowGuestEmailDialog(true);
    }
  };

  const handleGuestBookingSubmit = (guestData: z.infer<typeof guestEmailSchema>) => {
    startTransition(async () => {
        const result = await createBookingAction({
            listingId: listing.id,
            startDate: date!.from!.toISOString(),
            endDate: (date!.to || date!.from)!.toISOString(),
            guests: guests,
            numberOfUnits: units,
            guestEmail: guestData.email,
        });
        
        if (result.success) {
            toast({
                title: "Booking Request Sent!",
                description: result.message,
                duration: 9000,
                action: <div className="p-2 bg-accent rounded-full"><PartyPopper className="h-5 w-5 text-accent-foreground" /></div>,
            });
            setShowGuestEmailDialog(false);
            guestForm.reset();
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
};


  const isBookable = !isPending && date?.from && availability.availableCount > 0 && !availability.isChecking && units > 0 && units <= availability.availableCount;

  return (
    <>
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
        <div className="rounded-lg border">
          <div className="flex">
            <div className="flex-1 p-3">
              <Label className="text-xs font-bold uppercase">Check-in</Label>
              <div className="text-sm">{date?.from ? format(date.from, 'MM/dd/yyyy') : 'Add date'}</div>
            </div>
            <Separator orientation="vertical" className="h-auto" />
             <div className="flex-1 p-3">
              <Label className="text-xs font-bold uppercase">Check-out</Label>
              <div className="text-sm">{date?.to ? format(date.to, 'MM/dd/yyyy') : 'Add date'}</div>
            </div>
          </div>
           <Separator/>
          <div className="p-3">
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <Label className="text-xs font-bold uppercase">Dates</Label>
                   <div className="text-sm text-muted-foreground">
                    {date?.from ? 'Click to change dates' : 'Select your dates'}
                   </div>
                </div>
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
          </div>
        </div>
        
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
        
        <div className="min-h-5 text-center text-sm mb-2 flex items-center justify-center px-2">
            {availability.message && (
                <span className={availability.availableCount <= 0 ? 'text-destructive' : 'text-accent'}>
                    {availability.message}
                </span>
            )}
        </div>
        
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
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Continue as Guest</DialogTitle>
                <DialogDescription>
                    To complete your booking, please enter your email address. An account will be created for you if one doesn't exist.
                </DialogDescription>
            </DialogHeader>
            <Form {...guestForm}>
                <form onSubmit={guestForm.handleSubmit(handleGuestBookingSubmit)} className="space-y-4 py-4">
                    <FormField
                        control={guestForm.control}
                        name="email"
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
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setShowGuestEmailDialog(false)} disabled={isPending}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Booking
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
