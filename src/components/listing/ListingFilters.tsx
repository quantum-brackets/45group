
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Users, Calendar as CalendarIcon, SlidersHorizontal, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ListingType } from '@/lib/types';

export function ListingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState('');
  const [type, setType] = useState<ListingType | ''>('');
  const [guests, setGuests] = useState('');
  const [date, setDate] = useState<DateRange | undefined>();

  useEffect(() => {
    setLocation(searchParams.get('location') || '');
    setType((searchParams.get('type') as ListingType) || '');
    setGuests(searchParams.get('guests') || '');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from) {
      setDate({ from: parseISO(from), to: to ? parseISO(to) : undefined });
    } else {
      setDate(undefined);
    }
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (location) params.set('location', location); else params.delete('location');
    if (type) params.set('type', type); else params.delete('type');
    if (guests) params.set('guests', guests); else params.delete('guests');
    if (date?.from) params.set('from', date.from.toISOString()); else params.delete('from');
    if (date?.to) params.set('to', date.to.toISOString()); else params.delete('to');
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-md border">
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-center">
        
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <label htmlFor="location" className="sr-only">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              id="location" 
              placeholder="Search by city or location..." 
              className="pl-10"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <Select
            onValueChange={(value) => setType(value === "all" ? "" : (value as ListingType))}
            value={type || "all"}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="number" 
              placeholder="Guests" 
              className="pl-10 w-full sm:w-[120px]"
              value={guests}
              min="1"
              onChange={(e) => setGuests(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:flex-1 sm:min-w-[240px]">
          <Popover>
            <PopoverTrigger asChild>
               <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-full sm:w-auto">
            <Button className="w-full" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
            </Button>
        </div>
      </div>
    </div>
  );
}
