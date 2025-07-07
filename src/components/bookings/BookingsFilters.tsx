
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
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 items-center", isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        <div className="lg:col-span-1">
            <Select onValueChange={setListingId} value={listingId}>
                <SelectTrigger>
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
        </div>

        {isAdmin && (
            <div className="lg:col-span-1">
                <Select onValueChange={setUserId} value={userId}>
                    <SelectTrigger>
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
            </div>
        )}

        <div className="lg:col-span-1">
            <Select onValueChange={setStatus} value={status}>
                <SelectTrigger>
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

        <div className={cn("flex gap-2 lg:col-span-1", isAdmin ? "lg:col-start-5" : "md:col-start-2 lg:col-start-4")}>
            <Button className="w-full" onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" />
                Filter
            </Button>
            {isFiltered && (
              <Button variant="ghost" className="w-full" onClick={handleClear}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
              </Button>
            )}
        </div>
    </div>
  );
}
