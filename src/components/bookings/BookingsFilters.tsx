
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, XCircle } from 'lucide-react';

export function BookingsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');

  const isFiltered = searchParams.has('q');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    router.push(`/bookings?${params.toString()}`);
  };
  
  const handleClear = () => {
    setQuery('');
    router.push('/bookings');
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleFilter();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-center gap-4">
      <div className="relative w-full flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookings by name, status, venue..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10"
        />
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
