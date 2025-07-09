
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
    if (userId && canFilterUsers) params.set('userId', userId); else params.delete('userId');
    if (status && status !== 'all') params.set('status', status); else params.delete('status');
    router.push(`/bookings?${params.toString()}`);
  };
  
  const handleClear = () => {
    router.push('/bookings');
  }

  const canFilterUsers = session?.role === 'admin' || session?.role === 'staff';

  const listingOptions = [
    ...new Map(listings.map((item) => [item.name, { label: item.name, value: item.id }])).values(),
  ];

  const userOptions = [
    ...new Map(users.map((item) => [item.name, { label: `${item.name} (${item.email})`, value: item.id }])).values(),
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-4">
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Combobox 
                options={listingOptions}
                value={listingId}
                onChange={setListingId}
                placeholder="Filter by Venue"
                searchPlaceholder="Search venues..."
                emptyPlaceholder="No venues found."
                className="w-full"
            />
        </div>
        
        {canFilterUsers && (
            <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Combobox 
                    options={userOptions}
                    value={userId}
                    onChange={setUserId}
                    placeholder="Filter by User"
                    searchPlaceholder="Search users..."
                    emptyPlaceholder="No users found."
                    className="w-full"
                />
            </div>
        )}

        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[180px] flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select onValueChange={setStatus} value={status}>
                <SelectTrigger className="w-full">
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

        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleFilter} className="flex-1 sm:flex-none">
                <Search className="mr-2 h-4 w-4" />
                Filter
            </Button>
            {isFiltered && (
              <Button variant="ghost" onClick={handleClear} className="flex-1 sm:flex-none">
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
              </Button>
            )}
        </div>
    </div>
  );
}
