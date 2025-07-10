
"use client";

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { useRouter } from 'next/navigation';

import type { Booking, Listing, User, Bill, Payment } from '@/lib/types';
import { updateBookingAction, cancelBookingAction, confirmBookingAction, addBillAction, addPaymentAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar as CalendarLucide, Users, Info, Building, Edit, Loader2, User as UserIcon, History, KeySquare, Check, X, CircleUser, ArrowRight, Pencil, FileText, CircleUserRound, Receipt, CreditCard, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { BackButton } from '../common/BackButton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Combobox } from '../ui/combobox';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';


interface BookingDetailsProps {
  booking: Booking;
  listing: Listing;
  session: User;
  totalInventoryCount: number;
  allUsers?: User[];
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
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
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
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
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


export function BookingDetails({ booking, listing, session, totalInventoryCount, allUsers = [] }: BookingDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const router = useRouter();

  const canEdit = session.role === 'admin' || session.id === booking.userId;
  const isActionable = booking.status !== 'Cancelled';
  const canConfirm = session.role === 'admin' && booking.status === 'Pending';
  const canCancel = (session.role === 'admin' || (session.role === 'guest' && session.id === booking.userId)) && isActionable;
  const isAnyActionPending = isUpdatePending || isConfirmPending || isCancelPending;
  const isAdminOrStaff = session.role === 'admin' || session.role === 'staff';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookingName: booking.bookingName || '',
      dates: {
        from: parseISO(booking.startDate),
        to: parseISO(booking.endDate),
      },
      guests: booking.guests,
      numberOfUnits: booking.inventoryIds?.length || 1,
      userId: booking.userId,
    }
  });
  
  const baseBookingCost = useMemo(() => {
    if (!booking.startDate || !booking.endDate || !listing.price || !listing.price_unit) return 0;

    const from = parseISO(booking.startDate);
    const to = parseISO(booking.endDate);
    const units = (booking.inventoryIds || []).length;
    const guests = booking.guests;

    const durationDays = differenceInCalendarDays(to, from) + 1;
    const nights = durationDays > 1 ? durationDays - 1 : 1;

    switch(listing.price_unit) {
        case 'night':
            return listing.price * nights * units;
        case 'hour':
            // This assumes a standard 8-hour day for daily-booked hourly rentals.
            return listing.price * durationDays * 8 * units;
        case 'person':
            return listing.price * guests * units;
        default:
            return 0;
    }
  }, [booking, listing]);

  const addedBillsTotal = useMemo(() => (booking.bills || []).reduce((sum, bill) => sum + bill.amount, 0), [booking.bills]);
  const totalBill = baseBookingCost + addedBillsTotal;
  const totalPayments = useMemo(() => (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0), [booking.payments]);
  const balance = totalBill - totalPayments;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: listing.currency || 'USD',
    }).format(amount);
  };


  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!data.dates.from) return;

    startUpdateTransition(async () => {
      const result = await updateBookingAction({
        bookingId: booking.id,
        bookingName: data.bookingName,
        startDate: data.dates.from.toISOString(),
        endDate: (data.dates.to || data.dates.from).toISOString(),
        guests: data.guests,
        numberOfUnits: data.numberOfUnits,
        userId: data.userId,
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
    startConfirmTransition(async () => {
        const result = await confirmBookingAction({ bookingId: booking.id });
        if (result.success) {
            toast({ title: "Booking Confirmed", description: result.success });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    });
  };

  const handleCancel = () => {
      startCancelTransition(async () => {
          const result = await cancelBookingAction({ bookingId: booking.id });
          if (result.success) {
              toast({ title: "Booking Cancelled", description: result.message });
              router.refresh();
          } else {
              toast({ title: "Error", description: result.error, variant: "destructive" });
          }
      });
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
                    {format(parseISO(booking.startDate), 'PPP')} to {format(parseISO(booking.endDate), 'PPP')}
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
                    <p>
                    <Badge variant={booking.status === 'Confirmed' ? 'default' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
                        {booking.status}
                    </Badge>
                    </p>
                </div>
                </div>
                {(session.role === 'admin' || session.role === 'staff') && booking.userName && (
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border">
                    <UserIcon className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
                    <div>
                    <p className="font-semibold">Booked By</p>
                    <p className="text-muted-foreground">
                        <Link href={`/dashboard/edit-user/${booking.userId}`} className="text-primary hover:underline">
                            {booking.userName}
                        </Link>
                        {booking.createdAt && (
                        <span className="block text-sm">on {format(parseISO(booking.createdAt), 'PPP')}</span>
                        )}
                    </p>
                    </div>
                </div>
                )}
            </div>

            <div className="space-y-6">
                {(session.role === 'admin' || session.role === 'staff') && (
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
                  const sortedActions = booking.actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
                                    {isClient ? format(parseISO(mostRecentAction.timestamp), 'MMM d, yyyy, h:mm a') : <Skeleton className="h-4 w-32" />}
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
                                        {isClient ? format(parseISO(action.timestamp), 'MMM d, yyyy, h:mm a') : <Skeleton className="h-4 w-32" />}
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

                 {isAdminOrStaff && (
                    <div className="pt-6 border-t">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Billing Summary
                            </h3>
                            <div className="flex gap-2">
                                <AddBillDialog bookingId={booking.id} currency={listing.currency} disabled={isAnyActionPending} />
                                <AddPaymentDialog bookingId={booking.id} currency={listing.currency} disabled={isAnyActionPending} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <Card className="text-center p-4">
                                <CardTitle className="text-lg">{formatCurrency(totalBill)}</CardTitle>
                                <CardDescription>Total Bill</CardDescription>
                            </Card>
                            <Card className="text-center p-4">
                                <CardTitle className="text-lg text-green-600">{formatCurrency(totalPayments)}</CardTitle>
                                <CardDescription>Total Paid</CardDescription>
                            </Card>
                             <Card className={cn("text-center p-4", balance > 0 ? "bg-destructive/10" : "bg-green-100")}>
                                <CardTitle className={cn("text-lg", balance > 0 ? "text-destructive" : "text-green-700")}>{formatCurrency(balance)}</CardTitle>
                                <CardDescription>{balance > 0 ? 'Balance Due' : 'Credit'}</CardDescription>
                            </Card>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                             <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Receipt className="h-4 w-4" /> Bills</h4>
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
                                                    <p className="text-xs text-muted-foreground">Initial reservation cost</p>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(baseBookingCost)}</TableCell>
                                            </TableRow>
                                            {booking.bills?.map(bill => (
                                                <TableRow key={bill.id}>
                                                    <TableCell>
                                                        <p>{bill.description}</p>
                                                        <p className="text-xs text-muted-foreground">Added by {bill.actorName} on {format(parseISO(bill.createdAt), 'PP')}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(bill.amount)}</TableCell>
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
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</h4>
                                <Card>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Details</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                             {(booking.payments || []).length > 0 ? booking.payments?.map(payment => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{payment.method}</p>
                                                        {payment.notes && (
                                                            <p className="text-sm text-muted-foreground italic mt-1">"{payment.notes}"</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">Recorded by {payment.actorName} on {format(parseISO(payment.timestamp), 'PP')}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No payments recorded yet.</TableCell>
                                                </TableRow>
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
                {canEdit && isActionable && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isAnyActionPending}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                )}
                {canConfirm && (
                    <Button size="sm" onClick={handleConfirm} disabled={isAnyActionPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isConfirmPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Confirm
                    </Button>
                )}
                {canCancel && (
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
                                    disabled={isCancelPending}>
                                    {isCancelPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    <FormItem className="flex flex-col">
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
                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                    {format(field.value.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(field.value.from, "LLL dd, y")
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
                                    max={listing.maxGuests}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {listing.maxGuests} guests per unit.
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
                                    max={totalInventoryCount}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Max {totalInventoryCount} units available.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {isAdminOrStaff && (
                    <div className="md:col-span-2">
                        <FormField
                            control={form.control}
                            name="userId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
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
  );
}

    

    