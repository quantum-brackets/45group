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

interface BookingFormProps {
  listing: Listing;
}

export function BookingForm({ listing }: BookingFormProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
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
          <Label className="font-semibold">Select Date</Label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border mt-1"
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
