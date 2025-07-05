"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Users, Calendar as CalendarIcon, SlidersHorizontal, Search } from 'lucide-react';
import { format } from 'date-fns';

export function ListingFilters() {
  const [date, setDate] = useState<Date | undefined>();

  return (
    <div className="bg-card p-4 rounded-lg shadow-md border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
        <div className="lg:col-span-2">
          <label htmlFor="location" className="sr-only">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="location" placeholder="Search by city or location..." className="pl-10" />
          </div>
        </div>
        <div>
          <Select>
            <SelectTrigger>
              <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Type of place" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="event-center">Event Center</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="number" placeholder="Guests" className="pl-10" />
          </div>
        </div>
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button className="w-full lg:col-start-5">
            <Search className="mr-2 h-4 w-4" />
            Search
        </Button>
      </div>
    </div>
  );
}
