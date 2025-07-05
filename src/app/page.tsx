"use client";

import { useState, useCallback } from 'react';
import { ListingFilters } from '@/components/listing/ListingFilters';
import { ListingCard } from '@/components/listing/ListingCard';
import { listings, bookings } from '@/lib/data';
import type { Listing, ListingType } from '@/lib/types';
import type { DateRange } from 'react-day-picker';

interface FilterValues {
  location: string;
  type: ListingType | '';
  guests: string;
  date: DateRange | undefined;
}

export default function Home() {
  const [filteredListings, setFilteredListings] = useState<Listing[]>(listings);

  const handleFilterChange = useCallback((filters: FilterValues) => {
    let newFilteredListings = [...listings];

    // Filter by location
    if (filters.location) {
      newFilteredListings = newFilteredListings.filter(listing =>
        listing.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by type
    if (filters.type) {
      newFilteredListings = newFilteredListings.filter(
        listing => listing.type === filters.type
      );
    }
    
    // The guest filter is not implemented because there is no guest capacity data on listings.

    // Filter by date availability
    if (filters.date?.from) {
      const selectedFrom = filters.date.from;
      // If only a single date is selected, treat it as a one-day range.
      const selectedTo = filters.date.to || filters.date.from;

      newFilteredListings = newFilteredListings.filter(listing => {
        // Check for any confirmed booking that overlaps with the selected date range
        const isUnavailable = bookings.some(booking => {
          if (booking.listingId !== listing.id || booking.status !== 'Confirmed') {
            return false;
          }
          const bookingFrom = new Date(booking.startDate);
          const bookingTo = new Date(booking.endDate);
          
          // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
          return selectedFrom <= bookingTo && selectedTo >= bookingFrom;
        });
        return !isUnavailable;
      });
    }

    setFilteredListings(newFilteredListings);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold tracking-tight lg:text-5xl">
          Find Your Perfect Venue
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Discover and book unique hotels, event venues, and restaurants.
        </p>
      </header>
      
      <section className="mb-12">
        <ListingFilters onFilterChange={handleFilterChange} />
      </section>

      <section>
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
           <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">No Listings Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search filters to find what you're looking for.</p>
          </div>
        )}
      </section>
    </div>
  );
}
