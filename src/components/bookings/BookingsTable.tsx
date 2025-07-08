
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Booking, User } from '@/lib/types';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cancelBookingAction, confirmBookingAction } from '@/lib/actions';

interface BookingsTableProps {
  bookings: Booking[];
  session: User | null;
}

export function BookingsTable({ bookings, session }: BookingsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCancelPending, startCancelTransition] = useTransition();
  const [isConfirmPending, startConfirmTransition] = useTransition();

  const handleCancel = (bookingId: string) => {
    startCancelTransition(async () => {
      const result = await cancelBookingAction({ bookingId });
      if (result.success) {
        toast({
          title: "Booking Cancelled",
          description: result.success,
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  const handleConfirm = (bookingId: string) => {
    startConfirmTransition(async () => {
        const result = await confirmBookingAction({ bookingId });
        if (result.success) {
            toast({
                title: "Booking Confirmed",
                description: result.success,
            });
        } else {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardDescription>
          {session?.role === 'admin' ? 'An overview of all bookings across all venues.' : 'An overview of your past and upcoming bookings.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venue / Units</TableHead>
              {(session?.role === 'admin' || session?.role === 'staff') && (
                <TableHead className="hidden sm:table-cell">User</TableHead>
              )}
              <TableHead>Dates</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  <div className="font-medium">{booking.listingName}</div>
                  <div className="text-sm text-muted-foreground">{booking.inventoryIds.length} unit(s)</div>
                </TableCell>
                {(session?.role === 'admin' || session?.role === 'staff') && (
                  <TableCell className="hidden sm:table-cell">{booking.userName}</TableCell>
                )}
                <TableCell>
                  {booking.startDate === booking.endDate
                    ? booking.startDate
                    : `${booking.startDate} to ${booking.endDate}`}
                </TableCell>
                <TableCell>{booking.guests}</TableCell>
                <TableCell>
                  <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/booking/${booking.id}`)}>View Details</DropdownMenuItem>
                            {(session?.role === 'admin' || session?.role === 'staff') && (
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-user/${booking.userId}`)}>View Guest</DropdownMenuItem>
                             )}
                             {session?.role === 'admin' && (
                                <>
                                 {booking.status === 'Pending' && (
                                    <DropdownMenuItem 
                                        disabled={isConfirmPending}
                                        onClick={() => handleConfirm(booking.id)}
                                    >Confirm Booking</DropdownMenuItem>
                                 )}
                                 <DropdownMenuItem 
                                    className="text-destructive"
                                    disabled={isCancelPending || booking.status === 'Cancelled'}
                                    onClick={() => handleCancel(booking.id)}
                                 >Cancel Booking</DropdownMenuItem>
                                </>
                            )}
                             {session?.role === 'guest' && booking.userId === session.id && (
                                 <DropdownMenuItem 
                                    className="text-destructive"
                                    disabled={isCancelPending || booking.status === 'Cancelled'}
                                    onClick={() => handleCancel(booking.id)}
                                 >Cancel Booking</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
