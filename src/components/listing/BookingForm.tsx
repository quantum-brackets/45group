"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"
import type { Listing } from '@/lib/types';
import { PartyPopper } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface BookingFormProps {
  listing: Listing;
}

export function BookingForm({ listing }: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const { toast } = useToast();

  const handleBooking = () => {
    toast({
      title: "Booking Confirmed!",
      description: `Your booking at ${listing.name} has been confirmed.`,
      action: <div className="p-2 bg-accent rounded-full"><PartyPopper className="h-5 w-5 text-accent-foreground" /></div>,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>
          <span className="text-2xl font-bold text-primary">${listing.price}</span>
          <span className="text-base font-normal text-muted-foreground">/{listing.priceUnit}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
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
          <Calendar
            mode="range"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>
        <div>
          <Label htmlFor="guests" className="font-semibold">Number of Guests</Label>
          <Input
            id="guests"
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value, 10))}
            className="mt-1"
          />
        </div>
        <Button onClick={handleBooking} className="w-full text-lg" size="lg">
          Book Now
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          You won't be charged yet
        </div>
      </CardContent>
    </Card>
  );
}
