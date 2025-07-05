"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MapPin, Users, Calendar as CalendarIcon, SlidersHorizontal, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export function ListingFilters() {
  const [date, setDate] = useState<DateRange | undefined>();

  return (
    <div className="bg-card p-4 rounded-lg shadow-md border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-center">
        <div className="lg:col-span-2">
          <label htmlFor="location" className="sr-only">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="location" placeholder="Search by city or location..." className="pl-10" />
          </div>
        </div>
        <div className="lg:col-span-1">
          <Select>
            <SelectTrigger>
              <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-1">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="number" placeholder="Guests" className="pl-10" />
          </div>
        </div>
        <div className="lg:col-span-2">
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
        <Button className="w-full lg:col-span-1">
            <Search className="mr-2 h-4 w-4" />
            Search
        </Button>
      </div>
    </div>
  );
}
