
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Booking, User, Role, Permission } from '@/lib/types';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cancelBookingAction, confirmBookingAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { Badge } from '../ui/badge';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookings.map((booking) => (
            <Card key={booking.id} className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-col" onClick={() => router.push(`/booking/${booking.id}`)}>
                <CardContent className="p-4 relative flex-grow">
                     <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
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
                        </div>

                    <div className="flex justify-between items-start gap-4 pr-10">
                        <div className="flex-grow">
                            <p className="font-bold text-base leading-tight truncate">{booking.listingName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                                {booking.bookingName || 'N/A'}
                                {canSeeAllUserDetails && ` (${booking.userName})`}
                            </p>
                        </div>
                        {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        <p>
                            <span className="font-semibold text-foreground/80">Dates:</span> {booking.startDate === booking.endDate
                                ? booking.startDate
                                : `${booking.startDate} to ${booking.endDate}`}
                        </p>
                        <p>
                            <span className="font-semibold text-foreground/80">Units:</span> {(booking.inventoryIds || []).length} unit(s)
                        </p>
                    </div>

                </CardContent>
            </Card>
        ))}
      </div>
  );
}
