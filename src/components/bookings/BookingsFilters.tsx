
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, User as UserIcon, ListFilter, Search, XCircle } from 'lucide-react';
import type { Listing, User, Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BookingsFiltersProps {
  listings: Listing[];
  users: User[];
  session: User | null;
}

export function BookingsFilters({ listings, users, session }: BookingsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listingId, setListingId] = useState('all');
  const [userId, setUserId] = useState('all');
  const [status, setStatus] = useState('all');

  const isFiltered = searchParams.has('listingId') || searchParams.has('userId') || searchParams.has('status');

  useEffect(() => {
    setListingId(searchParams.get('listingId') || 'all');
    setUserId(searchParams.get('userId') || 'all');
    setStatus(searchParams.get('status') || 'all');
  }, [searchParams]);

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (listingId && listingId !== 'all') params.set('listingId', listingId); else params.delete('listingId');
    if (userId && session?.role === 'admin' && userId !== 'all') params.set('userId', userId); else params.delete('userId');
    if (status && status !== 'all') params.set('status', status); else params.delete('status');
    router.push(`/bookings?${params.toString()}`);
  };
  
  const handleClear = () => {
    router.push('/bookings');
  }

  const isAdmin = session?.role === 'admin';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
            <Select onValueChange={setListingId} value={listingId}>
                <SelectTrigger className="w-full sm:w-auto">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Venue" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    {listings.map(listing => (
                        <SelectItem key={listing.id} value={listing.id}>{listing.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isAdmin && (
                <Select onValueChange={setUserId} value={userId}>
                    <SelectTrigger className="w-full sm:w-auto">
                        <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by User" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <Select onValueChange={setStatus} value={status}>
                <SelectTrigger className="w-full sm:w-auto">
                    <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="flex gap-2 self-end md:self-center">
            <Button onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" />
                Filter
            </Button>
            {isFiltered && (
              <Button variant="ghost" onClick={handleClear}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
              </Button>
            )}
        </div>
    </div>
  );
}
