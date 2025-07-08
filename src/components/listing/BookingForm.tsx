
"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"
import type { Listing } from '@/lib/types';
import { Loader2, PartyPopper } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { createBookingAction } from '@/lib/actions';

interface BookingFormProps {
  listing: Listing;
}

export function BookingForm({ listing }: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleBooking = () => {
    if (!date?.from) {
        toast({
            title: "Please select dates",
            description: "You must select a start and end date for your booking.",
            variant: "destructive",
        });
        return;
    }

    startTransition(async () => {
        const result = await createBookingAction({
            listingId: listing.id,
            startDate: date.from!.toISOString(),
            endDate: (date.to || date.from)!.toISOString(),
            guests: guests,
        });

        if (result.success) {
            toast({
                title: "Booking Request Sent!",
                description: result.message,
                action: <div className="p-2 bg-accent rounded-full"><PartyPopper className="h-5 w-5 text-accent-foreground" /></div>,
            });
            setDate(undefined);
            setGuests(1);
        } else {
            toast({
                title: "Booking Failed",
                description: result.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>
          <span className="text-xl font-bold text-primary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: listing.currency || 'NGN', minimumFractionDigits: 0 }).format(listing.price)}
          </span>
          <span className="text-base font-normal text-muted-foreground">/{listing.priceUnit}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div>
          <div className="px-6">
            <Label className="font-semibold">Select Dates</Label>
            <div className="text-center text-sm text-muted-foreground p-2 border mt-1 mb-2 rounded-md">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, yyyy")} - {format(date.to, "LLL dd, yyyy")}
                  </>
                ) : (
                  format(date.from, "LLL dd, yyyy")
                )
              ) : (
                <span>Pick your dates</span>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              className="rounded-md border"
              disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
        </div>
        <div className="px-6">
          <Label htmlFor="guests" className="font-semibold">Number of Guests</Label>
          <Input
            id="guests"
            type="number"
            min="1"
            max={listing.maxGuests}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value, 10) || 1)}
            className="mt-1"
          />
        </div>
        <div className="px-6 pt-2">
          <Button onClick={handleBooking} disabled={isPending || !date?.from} className="w-full text-lg" size="lg">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request to Book"}
          </Button>
          <div className="text-center text-sm text-muted-foreground mt-2">
            You won't be charged yet
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
