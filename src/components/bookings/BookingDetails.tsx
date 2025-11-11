
"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { differenceInCalendarDays, isBefore } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useToast } from '@/hooks/use-toast';
import { addBillAction, addPaymentAction, cancelBookingAction, completeBookingAction, confirmBookingAction, getAvailableInventoryForBookingAction, setDiscountAction, updateBookingAction } from '@/lib/actions';
import type { Booking, Listing, ListingInventory, Permission, Role, User } from '@/lib/types';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_BOOKING_DAILY_HRS, MAX_DISCOUNT_PERCENT } from '@/lib/constants';
import { hasPermission } from '@/lib/permissions';
import { cn, formatCurrency, formatDateToStr, parseDate } from "@/lib/utils";
import { Calendar as CalendarLucide, Check, CheckCircle, CircleUser, CreditCard, DollarSign, Edit, FileText, History, Info, KeySquare, Loader2, Pencil, Percent, Printer, Receipt, User as UserIcon, Users, X } from 'lucide-react';
import Link from 'next/link';
import type { DateRange } from "react-day-picker";
import { BackButton } from '@/components/common/BackButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookingSummary } from '@/components/bookings/BookingSummary';


interface BookingDetailsProps {
  booking: Booking;
  listing: Listing;
  session: User;
  allInventory?: ListingInventory[];
  allUsers?: User[];
  permissions: Record<Role, Permission[]> | null;
}

const formSchema = z.object({
  bookingName: z.string().min(1, "Booking name is required."),
  dates: z.object({
    from: z.date({ required_error: "A start date is required." }),
    to: z.date().optional(),
  }).refine(data => !!data.from, { message: "Start date is required" }),
  guests: z.coerce.number().int().min(1, "At least one guest is required."),
  numberOfUnits: z.coerce.number().int().min(1, "At least one unit is required."),
  userId: z.string().optional(),
  inventoryIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;


const AddBillSchema = z.object({
  description: z.string().min(1, "Description is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});
type AddBillValues = z.infer<typeof AddBillSchema>;

const AddBillDialog = ({ bookingId, currency, disabled }: { bookingId: string, currency: string, disabled: boolean }) => {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const form = useForm<AddBillValues>({ resolver: zodResolver(AddBillSchema), defaultValues: { description: '', amount: 0 } });

    const onSubmit = (data: AddBillValues) => {
        startTransition(async () => {
            const result = await addBillAction({ bookingId, ...data });
            if (result.success) {
                toast({ title: "Success", description: result.message });
                form.reset();
                setOpen(false);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}><Receipt className="mr-2 h-4 w-4" /> Add Bill</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Bill</DialogTitle>
                    <DialogDescription>Add a new charge to this booking's bill.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Room Service, Damages" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount ({currency})</FormLabel>
                                <FormControl><Input type="number" step="1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Bill</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


const AddPaymentSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
    method: z.enum(['Cash', 'Transfer', 'Debit', 'Credit'], { required_error: "Payment method is required." }),
    notes: z.string().optional(),
});
type AddPaymentValues = z.infer<typeof AddPaymentSchema>;

const AddPaymentDialog = ({ bookingId, currency, disabled }: { bookingId: string, currency: string, disabled: boolean }) => {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const form = useForm<AddPaymentValues>({ resolver: zodResolver(AddPaymentSchema), defaultValues: { amount: 0, method: 'Cash', notes: '' } });

    const onSubmit = (data: AddPaymentValues) => {
        startTransition(async () => {
            const result = await addPaymentAction({ bookingId, ...data });
            if (result.success) {
                toast({ title: "Success", description: result.message });
                form.reset();
                setOpen(false);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" disabled={disabled}><CreditCard className="mr-2 h-4 w-4" /> Add Payment</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record a Payment</DialogTitle>
                    <DialogDescription>Record a new payment made for this booking.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount ({currency})</FormLabel>
                                <FormControl><Input type="number" step="1" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a payment method" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Transfer">Transfer</SelectItem>
                                            <SelectItem value="Debit">Debit</SelectItem>
                                            <SelectItem value="Credit">Credit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="e.g., Paid at front desk." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record Payment</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


const SetDiscountDialog = ({ bookingId, currency, currentDiscount, baseBookingCost, disabled }: { bookingId: string, currency: string, currentDiscount: number, baseBookingCost: number, disabled: boolean }) => {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const maxDiscountAmount = useMemo(() => baseBookingCost * MAX_DISCOUNT_PERCENT / 100, [baseBookingCost]);
    const currentDiscountAmount = useMemo(() => baseBookingCost * (currentDiscount / 100), [baseBookingCost, currentDiscount]);

    const SetDiscountSchema = z.object({
        discount: z.coerce.number()
            .min(0, "Discount cannot be negative.")
            .max(maxDiscountAmount, `Discount cannot exceed ${formatCurrency(maxDiscountAmount, currency)} (${MAX_DISCOUNT_PERCENT}% of base cost).`),
        reason: z.string().min(1, "A reason for the discount is required."),
    });
    type SetDiscountValues = z.infer<typeof SetDiscountSchema>;

    const form = useForm<SetDiscountValues>({
        resolver: zodResolver(SetDiscountSchema),
        defaultValues: { discount: currentDiscountAmount, reason: '' }
    });

    useEffect(() => {
        form.reset({ discount: currentDiscountAmount, reason: '' });
    }, [currentDiscountAmount, form]);

    const onSubmit = (data: SetDiscountValues) => {
        startTransition(async () => {
            const discountPercentage = baseBookingCost > 0 ? (data.discount / baseBookingCost) * 100 : 0;
            const result = await setDiscountAction({ bookingId, discountPercentage, reason: data.reason });
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setOpen(false);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}><Percent className="mr-2 h-4 w-4" /> Set Discount</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Booking Discount</DialogTitle>
                    <DialogDescription>Apply a discount amount to the base rate of this booking. Maximum {MAX_DISCOUNT_PERCENT}%.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="discount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discount Amount ({currency})</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Discount</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Special promotion, customer loyalty reward" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Set Discount</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export function BookingDetails({ booking, listing, session, allInventory = [], allUsers = [], permissions }: BookingDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [isCheckingUnits, setIsCheckingUnits] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const router = useRouter();

  const canEditBooking = hasPermission(permissions, session, 'booking:update');
  const canConfirmBooking = hasPermission(permissions, session, 'booking:confirm');
  const canCancelBooking = hasPermission(permissions, session, 'booking:cancel') || hasPermission(permissions, session, 'booking:cancel:own', { ownerId: booking.userId });
  const canCompleteBooking = hasPermission(permissions, session, 'booking:confirm'); // Same permission as confirm
  const canAddBilling = hasPermission(permissions, session, 'booking:update');
  const canSeeUserDetails = hasPermission(permissions, session, 'user:read');
  const canReassignUnits = session.role === 'admin' || session.role === 'staff';

  const isActionable = booking.status !== 'Cancelled' && booking.status !== 'Completed';
  const isAnyActionPending = isUpdatePending || isActionPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingName: booking.bookingName || '',
      dates: {
        from: parseDate(booking.startDate),
        to: parseDate(booking.endDate),
      },
      guests: booking.guests,
      numberOfUnits: booking.inventoryIds?.length || 1,
      userId: booking.userId,
      inventoryIds: booking.inventoryIds || [],
    }
  });

  const watchedDates = form.watch('dates');
  const watchedNumberOfUnits = form.watch('numberOfUnits');

  useEffect(() => {
    if (!watchedDates?.from || !canReassignUnits) return;

    const fetchAvailableUnits = async () => {
        setIsCheckingUnits(true);
        const result = await getAvailableInventoryForBookingAction({
            listingId: booking.listingId,
            startDate: formatDateToStr(watchedDates.from!),
            endDate: formatDateToStr(watchedDates.to || watchedDates.from!),
            excludeBookingId: booking.id,
        });

        if (result.success) {
            setAvailableUnits(result.inventoryIds || []);
        } else {
            setAvailableUnits([]);
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsCheckingUnits(false);
    };

    fetchAvailableUnits();
  }, [watchedDates, booking.listingId, booking.id, canReassignUnits, toast]);


  const baseBookingCost = useMemo(() => {
    if (!booking.startDate || !booking.endDate || !listing.price || !listing.price_unit) return 0;

    const from = parseDate(booking.startDate);
    const to = parseDate(booking.endDate);

    const units = (booking.inventoryIds || []).length;
    const guests = booking.guests;

    const durationDays = differenceInCalendarDays(to, from) + 1;
    const nights = durationDays > 1 ? durationDays - 1 : 1;

    switch(listing.price_unit) {
        case 'night':
            return listing.price * nights * units;
        case 'hour':
            return listing.price * durationDays * EVENT_BOOKING_DAILY_HRS * units;
        case 'person':
            return listing.price * guests * units;
        default:
            return 0;
    }
  }, [booking.startDate, booking.endDate, listing.price, listing.price_unit, listing.price_unit, booking.inventoryIds, booking.guests]);

  const discountAmount = useMemo(() => {
      if (!booking.discount || booking.discount <= 0) return 0;
      return (baseBookingCost * booking.discount) / 100;
  }, [booking.discount, baseBookingCost]);

  const addedBillsTotal = useMemo(() => (booking.bills || []).reduce((sum, bill) => sum + bill.amount, 0), [booking.bills]);
  const totalBill = baseBookingCost + addedBillsTotal;
  const totalPayments = useMemo(() => (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) + discountAmount, [booking.payments, discountAmount]);
  const balance = totalBill - totalPayments;

  const depositRequired = useMemo(() => {
    let deposit = 0;
    const units = (booking.inventoryIds || []).length;
    switch(listing.price_unit) {
        case 'night':
            deposit = listing.price * 1 * units; // 1 night
            break;
        case 'hour':
            deposit = listing.price * 1 * units; // 1 hour
            break;
        case 'person':
            deposit = listing.price * 1 * units; // 1 person
            break;
    }
    return deposit;
  }, [listing, booking]);

  const staffActionIsBlocked = useMemo(() => {
    if (session.role === 'guest') return false; // This check doesn't apply to guests

    // Complete always requires full payment
    if (booking.status === 'Confirmed') {
        return balance > 0;
    }

    // Confirm requires deposit
    if (booking.status === 'Pending') {
        return totalPayments < depositRequired;
    }

    return false;
  }, [session.role, booking.status, balance, totalPayments, depositRequired]);

  const getStaffActionTooltip = () => {
    if (!staffActionIsBlocked) return null;

    if (booking.status === 'Confirmed') {
      return `Cannot mark as completed with an outstanding balance of ${formatCurrency(balance, listing.currency)}.`;
    }

    if (booking.status === 'Pending') {
      return `A deposit of at least ${formatCurrency(depositRequired, listing.currency)} is required to confirm.`;
    }

    return "This action is currently blocked.";
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!data.dates.from) return;

    if (canReassignUnits) {
        if (!data.inventoryIds || data.inventoryIds.length !== data.numberOfUnits) {
            form.setError('inventoryIds', { message: `Please select exactly ${data.numberOfUnits} unit(s).` });
            return;
        }
    }

    startUpdateTransition(async () => {
      const result = await updateBookingAction({
        bookingId: booking.id,
        bookingName: data.bookingName,
        startDate: formatDateToStr(data.dates.from),
        endDate: formatDateToStr(data.dates.to || data.dates.from),
        guests: data.guests,
        numberOfUnits: data.numberOfUnits,
        userId: data.userId,
        inventoryIds: data.inventoryIds,
      });

      if (result.success) {
        toast({
          title: "Booking Updated!",
          description: result.message,
        });
        setIsEditing(false);
        router.refresh();
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const handleConfirm = () => {
    startActionTransition(async () => {
        const result = await confirmBookingAction({ bookingId: booking.id });
        if (result.success) {
            toast({ title: "Booking Confirmed", description: result.success });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleComplete = () => {
    startActionTransition(async () => {
        const result = await completeBookingAction({ bookingId: booking.id });
        if (result.success) {
            toast({ title: "Booking Completed", description: result.success });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleCancel = () => {
      startActionTransition(async () => {
          const result = await cancelBookingAction({ bookingId: booking.id });
          if (result.success) {
              toast({ title: "Booking Cancelled", description: result.message });
              router.refresh();
          } else {
              toast({ title: "Error", description: result.error, variant: "destructive" });
          }
      });
  };

  const getStatusBadge = () => {
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

      return <Badge variant={variants[booking.status] || 'secondary'} className={cn(styles[booking.status as keyof typeof styles])}>{booking.status}</Badge>
  }

  const handlePrint = () => {
    const printContent = document.getElementById(`booking-summary-${booking.id}`);
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printSection = printContent.innerHTML;

    document.body.innerHTML = printSection;
    window.print();
    document.body.innerHTML = originalContents;
    // We need to re-attach event listeners or simply reload the page
    window.location.reload();
  };


  const DisplayView = () => (
    <>
        <CardContent className="space-y-6 pt-6 text-base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border md:col-span-2">
                    <Pencil className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Booking Name</p>
                        <p className="text-muted-foreground">{booking.bookingName || 'Not set'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <CalendarLucide className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Booking Dates</p>
                    <p className="text-muted-foreground">
                    {formatDateToStr(booking.startDate, 'PPP')} to {formatDateToStr(booking.endDate, 'PPP')}
                    </p>
                </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <Users className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Number of Guests</p>
                    <p className="text-muted-foreground">{booking.guests}</p>
                </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <Info className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Status</p>
                    <p>{getStatusBadge()}</p>
                </div>
                </div>
                {canSeeUserDetails && booking.userName && (
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                    <UserIcon className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                    <div>
                    <p className="font-semibold">Booked By</p>
                    <p className="text-muted-foreground">
                        <Link href={`/dashboard/edit-user/${booking.userId}`} className="text-primary hover:underline">
                            {booking.userName}
                        </Link>
                        {booking.createdAt && (
                        <span className="block text-sm">on {formatDateToStr(booking.createdAt, 'PP')}</span>
                        )}
                    </p>
                    </div>
                </div>
                )}
            </div>

            <div className="space-y-6">
                {canSeeUserDetails && (
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                        <FileText className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Notes on Guest</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{booking.userNotes || 'No notes for this guest.'}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                <KeySquare className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">{(booking.inventoryIds || []).length} Unit(s) Booked</p>
                    <p className="text-muted-foreground text-sm">
                    {booking.inventoryNames?.join(', ') || 'N/A'}
                    </p>
                </div>
                </div>
                {booking.actions && booking.actions.length > 0 && (() => {
                  const sortedActions = booking.actions.sort((a, b) => parseDate(b.timestamp).getTime() - parseDate(a.timestamp).getTime());
                  const mostRecentAction = sortedActions[0];

                  return (
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                      <History className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                      <div className="w-full">
                        <p className="font-semibold">Last Update</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="mt-2 cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded-md transition-colors">
                              <div className="flex gap-3">
                                <div className="flex flex-col items-center pt-1">
                                  <CircleUser className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground capitalize">{mostRecentAction.action}</span>
                                    <span className="text-muted-foreground">by {mostRecentAction.actorName}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {isClient ? formatDateToStr(mostRecentAction.timestamp, 'MMM d, yyyy, h:mm a') : <Skeleton className="h-4 w-32" />}
                                  </div>
                                  <p className="text-muted-foreground text-sm mt-1">{mostRecentAction.message}</p>
                                  <p className="text-xs text-primary mt-2 font-semibold">View full history...</p>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Full Booking History</DialogTitle>
                              <DialogDescription>
                                A complete log of all actions taken on this booking, from newest to oldest.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto pr-4 -mr-4">
                              <ul className="mt-2 space-y-4">
                                {sortedActions.map((action, index) => (
                                  <li key={index} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <CircleUser className="h-5 w-5 text-muted-foreground" />
                                      {index < sortedActions.length - 1 && (
                                        <div className="w-px h-full bg-border mt-1"></div>
                                      )}
                                    </div>
                                    <div className="flex-grow pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground capitalize">{action.action}</span>
                                        <span className="text-muted-foreground">by {action.actorName}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {isClient ? formatDateToStr(action.timestamp, 'MMM d, yyyy, h:mm a') : <Skeleton className="h-4 w-32" />}
                                      </div>
                                      <p className="text-muted-foreground text-sm mt-1">{action.message}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })()}

                 {canAddBilling && (
                    <div className="pt-6 border-t">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Billing Summary
                            </h3>
                             <div className="flex gap-2">
                                <SetDiscountDialog bookingId={booking.id} currency={listing.currency} currentDiscount={booking.discount || 0} baseBookingCost={baseBookingCost} disabled={isAnyActionPending} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <Card className="text-center p-4">
                                <CardTitle className="text-lg">{formatCurrency(totalBill, listing.currency)}</CardTitle>
                                <CardDescription>Total Bill</CardDescription>
                            </Card>
                            <Card className="text-center p-4">
                                <CardTitle className="text-lg text-green-600">{formatCurrency(totalPayments, listing.currency)}</CardTitle>
                                <CardDescription>Total Paid</CardDescription>
                            </Card>
                                <Card className={cn("text-center p-4", balance > 0 ? "bg-destructive/10" : "bg-green-100")}>
                                <CardTitle className={cn("text-lg", balance > 0 ? "text-destructive" : "text-green-700")}>{formatCurrency(balance, listing.currency)}</CardTitle>
                                <CardDescription>{balance > 0 ? 'Balance Due' : 'Credit'}</CardDescription>
                            </Card>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Bills</h4>
                                    <AddBillDialog bookingId={booking.id} currency={listing.currency} disabled={isAnyActionPending} />
                                </div>
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                                <TableRow>
                                                <TableCell>
                                                    <p className="font-medium">Base Booking Cost</p>
                                                    <p className="text-xs text-muted-foreground">Initial reservation cost ({formatCurrency(listing.price, listing.currency)})</p>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(baseBookingCost, listing.currency)}</TableCell>
                                            </TableRow>
                                            {booking.bills?.map(bill => (
                                                <TableRow key={bill.id}>
                                                    <TableCell>
                                                        <p>{bill.description}</p>
                                                        <p className="text-xs text-muted-foreground">Added by {bill.actorName} on {formatDateToStr(bill.createdAt, 'PP')}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(bill.amount, listing.currency)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(booking.bills || []).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-muted-foreground text-sm italic py-2">No additional bills added.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                                </div>
                                <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</h4>
                                    <AddPaymentDialog bookingId={booking.id} currency={listing.currency} disabled={isAnyActionPending} />
                                </div>
                                <Card>
                                        <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Details</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                                {(booking.discount && booking.discount > 0) ? (
                                                <TableRow>
                                                    <TableCell>
                                                        <p className="font-medium">Discount ({booking.discount.toFixed(2)}%)</p>
                                                        <p className="text-xs text-muted-foreground">Applied to base booking cost</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(discountAmount, listing.currency)}</TableCell>
                                                </TableRow>
                                                ): null}
                                                {(booking.payments || []).length > 0 ? booking.payments?.map(payment => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{payment.method}</p>
                                                        {payment.notes && (
                                                            <p className="text-sm text-muted-foreground italic mt-1">"{payment.notes}"</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">Recorded by {payment.actorName} on {formatDateToStr(payment.timestamp, 'PP')}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount, listing.currency)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                (booking.discount || 0) <= 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={2} className="text-center text-muted-foreground">No payments recorded yet.</TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4 bg-muted/50 p-4 border-t">
            <BackButton />
            <div className="flex flex-wrap justify-end items-center gap-2">
                {booking.status === 'Completed' && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Summary
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl p-0">
                            <DialogHeader className="p-6 pb-0 sr-only">
                                <DialogTitle>Booking Summary</DialogTitle>
                                <DialogDescription>A printable summary of the completed booking.</DialogDescription>
                            </DialogHeader>
                            <div id={`booking-summary-${booking.id}`} className="printable-area p-6 max-h-[80vh] overflow-y-auto">
                                <BookingSummary booking={booking} listing={listing} />
                            </div>
                            <DialogFooter className="p-4 border-t bg-background sm:justify-end">
                                <Button variant="ghost" onClick={() => (document.querySelector('[data-radix-dialog-default-open="true"] [aria-label="Close"]') as HTMLElement)?.click()}>Close</Button>
                                <Button onClick={handlePrint}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                {canEditBooking && isActionable && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isAnyActionPending}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                )}
                {canConfirmBooking && booking.status === 'Pending' && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                    <div className="inline-block"> {/* Wrapper for Tooltip with disabled button */}
                                    <Button size="sm" onClick={handleConfirm} disabled={isAnyActionPending || staffActionIsBlocked} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                        {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Confirm
                                    </Button>
                                    </div>
                            </TooltipTrigger>
                            {staffActionIsBlocked && (
                                <TooltipContent>
                                    <p>{getStaffActionTooltip()}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}
                {canCompleteBooking && booking.status === 'Confirmed' && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block">
                                    <Button size="sm" onClick={handleComplete} disabled={isAnyActionPending || staffActionIsBlocked}>
                                        {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Complete
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {staffActionIsBlocked && (
                                <TooltipContent>
                                    <p>{getStaffActionTooltip()}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}
                {canCancelBooking && isActionable && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isAnyActionPending}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently cancel the booking for {listing.name}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    onClick={handleCancel}
                                    disabled={isActionPending}>
                                    {isActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Yes, Cancel Booking
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </CardFooter>
    </>
    );

    const EditView = () => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                <div className="md:col-span-2">
                    <FormField
                        control={form.control}
                        name="bookingName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Booking Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Smith Family Vacation" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="md:col-span-2">
                <FormField
                    control={form.control}
                    name="dates"
                    render={({ field }) => (
                    <FormItem className="flex flex-col gap-1">
                        <FormLabel>Booking Dates</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value?.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarLucide className="mr-2 h-4 w-4" />
                                {field.value?.from ? (
                                field.value.to ? (
                                    <>
                                    {formatDateToStr(field.value.from, "LLL dd, y")} -{" "}
                                    {formatDateToStr(field.value.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    formatDateToStr(field.value.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Pick a date range</span>
                                )}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange as (date: DateRange | undefined) => void}
                            numberOfMonths={2}
                            disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>

                <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Guests</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min="1"
                                    max={listing.max_guests}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {listing.max_guests} guests per unit.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="numberOfUnits"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Units</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min="1"
                                    max={allInventory.length}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {allInventory.length} units available.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {canReassignUnits && (
                        <div className="md:col-span-2 space-y-2">
                        <FormField
                            control={form.control}
                            name="inventoryIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assigned Units</FormLabel>
                                    <FormDescription>
                                        Select {watchedNumberOfUnits} unit(s). Unavailable units are disabled.
                                    </FormDescription>
                                    {isCheckingUnits ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-8 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
                                            {allInventory.sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
                                                const isUnavailable = !availableUnits.includes(item.id) && !field.value?.includes(item.id);
                                                const isChecked = field.value?.includes(item.id);
                                                const limitReached = (field.value?.length || 0) >= watchedNumberOfUnits && !isChecked;

                                                return (
                                                    <FormField
                                                        key={item.id}
                                                        control={form.control}
                                                        name="inventoryIds"
                                                        render={({ field }) => (
                                                            <FormItem
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex items-center space-x-2 space-y-0 p-2 rounded-md transition-colors",
                                                                    (isUnavailable || limitReached) && "opacity-50 cursor-not-allowed",
                                                                    isChecked && "bg-accent/50"
                                                                )}
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        disabled={isUnavailable || limitReached}
                                                                        onCheckedChange={(checked) => {
                                                                            const currentSelection = field.value || [];
                                                                            return checked
                                                                                ? field.onChange([...currentSelection, item.id])
                                                                                : field.onChange(currentSelection.filter((value) => value !== item.id));
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className={cn("font-normal", (isUnavailable || limitReached) ? "cursor-not-allowed" : "cursor-pointer")}>
                                                                    {item.name}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )}
                                                    />
                                                )
                                            })}
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {canEditBooking && (
                    <div className="md:col-span-2">
                        <FormField
                            control={form.control}
                            name="userId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-1">
                                    <FormLabel>Booking Owner</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            options={allUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select a new owner..."
                                            searchPlaceholder="Search users..."
                                            emptyPlaceholder="No users found."
                                            className="w-full"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Reassign this booking to another user.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setIsEditing(false); form.reset(); }} disabled={isUpdatePending}>
                Cancel
                </Button>
                <Button type="submit" disabled={isUpdatePending}>
                {isUpdatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </CardFooter>
        </form>
    </Form>
    );

    return (
    <>
        <style>{`
        @media print {
            body > *:not(.printable-area) {
            display: none !important;
            }
            .printable-area {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            }
            html, body {
            background-color: #fff !important;
            }
        }
        `}</style>
        <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">
            <Link href={`/listing/${listing.id}`} className="hover:underline">{listing.name}</Link>
            </CardTitle>
            <CardDescription className="pt-1">
                <span className="font-mono text-muted-foreground break-all">{booking.id}</span>
            </CardDescription>
        </CardHeader>

        {isEditing ? <EditView /> : <DisplayView />}
        </Card>
    </>
  );
}
