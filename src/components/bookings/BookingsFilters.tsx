
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, User as UserIcon, ListFilter, Search, XCircle } from 'lucide-react';
import type { Listing, User } from '@/lib/types';
import { Combobox } from "@/components/ui/combobox";

interface BookingsFiltersProps {
  listings: Listing[];
  users: User[];
  session: User | null;
}

export function BookingsFilters({ listings, users, session }: BookingsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listingId, setListingId] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('all');

  const isFiltered = searchParams.has('listingId') || searchParams.has('userId') || searchParams.has('status');

  useEffect(() => {
    setListingId(searchParams.get('listingId') || '');
    setUserId(searchParams.get('userId') || '');
    setStatus(searchParams.get('status') || 'all');
  }, [searchParams]);

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (listingId) params.set('listingId', listingId); else params.delete('listingId');
    if (userId && session?.role === 'admin') params.set('userId', userId); else params.delete('userId');
    if (status && status !== 'all') params.set('status', status); else params.delete('status');
    router.push(`/bookings?${params.toString()}`);
  };
  
  const handleClear = () => {
    router.push('/bookings');
  }

  const isAdmin = session?.role === 'admin';

  const listingOptions = listings.map(listing => ({ label: listing.name, value: listing.id }));

  const userOptions = users.map(user => ({ label: user.name, value: user.id }));

  return (
    <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Combobox 
                    options={listingOptions}
                    value={listingId}
                    onChange={setListingId}
                    placeholder="Filter by Venue"
                    searchPlaceholder="Search venues..."
                    emptyPlaceholder="No venues found."
                    className="w-full sm:w-[200px]"
                />
            </div>
            
            {isAdmin && (
                <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Combobox 
                        options={userOptions}
                        value={userId}
                        onChange={setUserId}
                        placeholder="Filter by User"
                        searchPlaceholder="Search users..."
                        emptyPlaceholder="No users found."
                        className="w-full sm:w-[200px]"
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select onValueChange={setStatus} value={status}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
