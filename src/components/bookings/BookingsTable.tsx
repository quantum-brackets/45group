

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Booking, User, Role, Permission } from '@/lib/types';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cancelBookingAction, confirmBookingAction } from '@/lib/actions';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';

interface BookingsTableProps {
  bookings: Booking[];
  session: User | null;
  permissions: Record<Role, Permission[]> | null;
}

export function BookingsTable({ bookings, session, permissions }: BookingsTableProps) {
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
          description: result.message,
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

  const getStatusBadge = (status: Booking['status']) => {
      const variants = {
          Confirmed: 'default',
          Pending: 'secondary',
          Cancelled: 'destructive',
          'Completed': 'outline'
      } as const;
      
      const styles = {
          Confirmed: 'bg-accent text-accent-foreground',
          'Completed': 'bg-blue-500 text-white border-blue-500'
      }

      return <Badge variant={variants[status] || 'secondary'} className={cn(styles[status as keyof typeof styles])}>{status}</Badge>
  }

  const canSeeAllUserDetails = session && hasPermission(permissions, session, 'user:read');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardDescription>
          {canSeeAllUserDetails ? 'An overview of all bookings across all venues.' : 'An overview of your past and upcoming bookings.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venue / Units</TableHead>
              <TableHead className="hidden sm:table-cell">Booking For</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id} onClick={() => router.push(`/booking/${booking.id}`)} className="cursor-pointer">
                <TableCell className="font-medium">
                  <div className="font-medium">{booking.listingName}</div>
                  <div className="text-sm text-muted-foreground">{(booking.inventoryIds || []).length} unit(s)</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    <div className="font-medium">{booking.bookingName || 'N/A'}</div>
                    {canSeeAllUserDetails && (
                        <div className="text-sm text-muted-foreground">{booking.userName}</div>
                    )}
                </TableCell>
                <TableCell>
                  {booking.startDate && booking.endDate ? (
                    <>
                      <span className="hidden md:inline">
                        {booking.startDate === booking.endDate
                          ? format(parseISO(booking.startDate), 'PPP')
                          : `${format(parseISO(booking.startDate), 'PPP')} to ${format(parseISO(booking.endDate), 'PPP')}`}
                      </span>
                      <div className="md:hidden flex flex-col text-xs">
                          <span>{format(parseISO(booking.startDate), 'MMM d, yyyy')}</span>
                          {booking.startDate !== booking.endDate && <span>to {format(parseISO(booking.endDate), 'MMM d, yyyy')}</span>}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Invalid dates</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(booking.status)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {session && (
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
                                {hasPermission(permissions, session, 'user:read') && (
                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-user/${booking.userId}`)}>View Guest</DropdownMenuItem>
                                )}
                                {hasPermission(permissions, session, 'booking:confirm') && booking.status === 'Pending' && (
                                    <DropdownMenuItem 
                                        disabled={isConfirmPending}
                                        onClick={() => handleConfirm(booking.id)}
                                    >Confirm Booking</DropdownMenuItem>
                                )}
                                {(hasPermission(permissions, session, 'booking:cancel') || hasPermission(permissions, session, 'booking:cancel:own', { ownerId: booking.userId })) && booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        disabled={isCancelPending}
                                        onClick={() => handleCancel(booking.id)}
                                    >Cancel Booking</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
