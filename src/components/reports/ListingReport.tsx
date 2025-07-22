

"use client";

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { differenceInCalendarDays, sub } from 'date-fns';
import { Calendar as CalendarIcon, Download, Send, Users, Warehouse, Milestone, Loader2, Home, BarChart, XOctagon, FileSpreadsheet } from 'lucide-react';

import type { Booking, Listing, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/components/bookings/BookingSummary';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn, toZonedTimeSafe, formatDateToStr } from '@/lib/utils';
import { sendReportEmailAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { EVENT_BOOKING_DAILY_HRS } from '@/lib/constants';


interface ListingReportProps {
  listing?: Listing; // Optional: for single-listing reports
  initialBookings: Booking[];
  initialDateRange: DateRange;
  initialPeriod: { unit: string, amount: number };
  session: User | null;
}

type Grouping = 'status' | 'guest' | 'unit';

const calculateBookingFinancials = (booking: Booking, listing?: Listing) => {
    const from = toZonedTimeSafe(booking.startDate);
    const to = toZonedTimeSafe(booking.endDate);

    const units = (booking.inventoryIds || []).length;
    const guests = booking.guests;
    const durationDays = differenceInCalendarDays(to, from) + 1;
    const nights = durationDays > 1 ? durationDays - 1 : 1;
    let baseBookingCost = 0;
    
    // For global reports, pricing info is attached to the booking object itself.
    // For single-listing reports, it's on the listing object.
    const price = booking.price ?? listing?.price ?? 0;
    const price_unit = booking.price_unit ?? listing?.price_unit ?? 'night';

    switch(price_unit) {
        case 'night': baseBookingCost = price * nights * units; break;
        case 'hour': baseBookingCost = price * durationDays * EVENT_BOOKING_DAILY_HRS * units; break;
        case 'person': baseBookingCost = price * guests * units; break;
    }
    const discountAmount = baseBookingCost * (booking.discount || 0) / 100;
    const addedBillsTotal = (booking.bills || []).reduce((sum, bill) => sum + bill.amount, 0);
    const totalBill = baseBookingCost + addedBillsTotal;
    const totalPayments = (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) + discountAmount;
    const balance = totalBill - totalPayments;
    
    return { totalBill, totalPayments, balance, stayDuration: durationDays };
}

export function ListingReport({ listing, initialBookings, initialDateRange, initialPeriod, session }: ListingReportProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(initialDateRange.to);
  const [period, setPeriod] = useState(initialPeriod);
  const [isEmailPending, startEmailTransition] = useTransition();
  const [email, setEmail] = useState(session?.email || '');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const bookingsWithFinancials = useMemo(() => {
      // For global reports, the listing context is on each booking.
      return initialBookings.map(b => ({
          ...b,
          financials: calculateBookingFinancials(b, listing)
      }));
  }, [initialBookings, listing]);

  const financialSummary = useMemo(() => {
    const summary = {
      active: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
      cancelled: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
    };

    bookingsWithFinancials.forEach(booking => {
      const target = booking.status === 'Cancelled' ? summary.cancelled : summary.active;
      target.count += 1;
      target.totalPaid += booking.financials.totalPayments;
      target.totalOwed += booking.financials.totalBill;
      target.balance += booking.financials.balance;
    });

    return summary;
  }, [bookingsWithFinancials]);

  const groupedData = useMemo(() => {
    const statusOrder: Booking['status'][] = ['Confirmed', 'Pending', 'Completed', 'Cancelled'];
    const groupings: Record<Grouping, Record<string, typeof bookingsWithFinancials>> = {
      status: {},
      guest: {},
      unit: {},
    };

    bookingsWithFinancials.forEach(booking => {
      // Group by Status
      if (!groupings.status[booking.status]) groupings.status[booking.status] = [];
      groupings.status[booking.status].push(booking);

      // Group by Guest
      const guestName = booking.userName || 'Unknown Guest';
      if (!groupings.guest[guestName]) groupings.guest[guestName] = [];
      groupings.guest[guestName].push(booking);

      // Group by Unit
      (booking.inventoryNames || ['Unassigned']).forEach(unitName => {
        if (!groupings.unit[unitName]) groupings.unit[unitName] = [];
        groupings.unit[unitName].push(booking);
      });
    });

    const sortedStatusGroup = Object.fromEntries(
        Object.entries(groupings.status).sort(([a], [b]) => {
            return statusOrder.indexOf(a as Booking['status']) - statusOrder.indexOf(b as Booking['status']);
        })
    );

    return {
        status: sortedStatusGroup,
        guest: groupings.guest,
        unit: groupings.unit,
    };

  }, [bookingsWithFinancials]);

  const handleDateOrPeriodChange = () => {
    const targetDate = date || new Date();
    const periodString = `${period.amount}${period.unit}`;
    const basePath = listing ? `/reports/listing/${listing.id}` : '/reports';
    router.push(`${basePath}/${formatDateToStr(targetDate, 'yyyy-MM-dd')}/${periodString}`);
  };

  const getCsvData = () => {
    const headers = ["Booking ID", "Guest", "Venue", "Units", "Start Date", "End Date", "Duration (days)", "Paid", "Owed", "Balance", "Status", "Currency"];
    const currencyCode = listing?.currency || initialBookings[0]?.currency || 'NGN';
  
    const rows = bookingsWithFinancials.map(b => [
        b.id,
        b.userName,
        b.listingName,
        b.inventoryNames?.join(', ') || 'N/A',
        formatDateToStr(toZonedTimeSafe(b.startDate), 'yyyy-MM-dd'),
        formatDateToStr(toZonedTimeSafe(b.endDate), 'yyyy-MM-dd'),
        b.financials.stayDuration,
        b.financials.totalPayments.toFixed(2),
        b.financials.totalBill.toFixed(2),
        b.financials.balance.toFixed(2),
        b.status,
        currencyCode,
    ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
  
    return [headers.join(','), ...rows].join('\n');
  };

  const handleExportCsv = () => {
    const csvContent = getCsvData();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const reportDate = formatDateToStr(initialDateRange?.to || initialDateRange?.from || new Date(), 'yyyy-MM-dd');
      link.setAttribute('href', url);
      link.setAttribute('download', `report_${(listing?.name || 'all').replace(/\s+/g, '_')}_${reportDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportOpen(false);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableData: any[] = [];
    const headers = ["Guest", "Venue", "Units", "Start Date", "Duration (days)", "Paid", "Owed", "Balance", "Status"];
    const currencyCode = listing?.currency || initialBookings[0]?.currency || 'NGN';

    bookingsWithFinancials.forEach(b => {
        tableData.push([
            b.userName,
            b.listingName,
            b.inventoryNames?.join(', ') || 'N/A',
            formatDateToStr(toZonedTimeSafe(b.startDate), 'MMM d, yyyy'),
            b.financials.stayDuration,
            formatCurrency(b.financials.totalPayments, currencyCode),
            formatCurrency(b.financials.totalBill, currencyCode),
            formatCurrency(b.financials.balance, currencyCode),
            b.status,
        ]);
    });

    doc.setFontSize(18);
    doc.text(`Booking Report for ${listing?.name || 'All Venues'}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateDisplay = initialDateRange?.from ? `${formatDateToStr(initialDateRange.from, 'LLL dd, y')} - ${initialDateRange.to ? formatDateToStr(initialDateRange.to, 'LLL dd, y') : ''}` : 'All time';
    doc.text(`Period: ${dateDisplay}`, 14, 30);
    
    autoTable(doc, {
        startY: 35,
        head: [headers],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [211, 76, 35] },
    });

    // Add financial summary to the PDF
    const finalY = (doc as any).lastAutoTable.finalY || 10;
    doc.setFontSize(14);
    doc.text('Financial Summary', 14, finalY + 15);

    const summaryData = [
        [
            `${financialSummary.active.count} Active/Completed Booking(s)`,
            formatCurrency(financialSummary.active.totalPaid, currencyCode),
            formatCurrency(financialSummary.active.totalOwed, currencyCode),
            formatCurrency(financialSummary.active.balance, currencyCode),
        ],
        [
            `${financialSummary.cancelled.count} Cancelled Booking(s)`,
            formatCurrency(financialSummary.cancelled.totalPaid, currencyCode),
            formatCurrency(financialSummary.cancelled.totalOwed, currencyCode),
            formatCurrency(financialSummary.cancelled.balance, currencyCode),
        ],
    ];

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Category', 'Total Paid', 'Total Owed', 'Balance']],
        body: summaryData,
        theme: 'grid',
    });


    const reportDate = formatDateToStr(initialDateRange?.to || initialDateRange?.from || new Date(), 'yyyy-MM-dd');
    doc.save(`report_${(listing?.name || 'all').replace(/\s+/g, '_')}_${reportDate}.pdf`);
    setIsExportOpen(false);
  };
  
  const handleSendEmail = () => {
    startEmailTransition(async () => {
      // For a global report, listingId is null. The server action needs to handle this.
      const result = await sendReportEmailAction({
        listingId: listing?.id,
        fromDate: initialDateRange.from!.toISOString(),
        toDate: initialDateRange.to!.toISOString(),
        email,
      });

      if (result.success) {
        toast({
          title: 'Report Sent!',
          description: result.message,
        });
        setIsExportOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
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

  const ReportTable = ({ bookings, title }: { bookings: typeof bookingsWithFinancials, title: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              {!listing && <TableHead>Venue</TableHead>}
              <TableHead>Units</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map(b => (
              <TableRow key={b.id} onClick={() => router.push(`/booking/${b.id}`)} className="cursor-pointer">
                <TableCell>{b.userName}</TableCell>
                {!listing && <TableCell>{b.listingName}</TableCell>}
                <TableCell>{b.inventoryNames?.join(', ') || 'N/A'}</TableCell>
                <TableCell>{formatDateToStr(toZonedTimeSafe(b.startDate), 'MMM d')} - {formatDateToStr(toZonedTimeSafe(b.endDate), 'MMM d, yyyy')} ({b.financials.stayDuration}d)</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(b.financials.totalPayments, b.currency || listing?.currency || 'NGN')}</TableCell>
                <TableCell className={`text-right font-medium ${b.financials.balance > 0 ? 'text-destructive' : ''}`} style={{whiteSpace: 'nowrap'}}>{formatCurrency(b.financials.balance, b.currency || listing?.currency || 'NGN')}</TableCell>
                <TableCell>{getStatusBadge(b.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Booking Report: {listing?.name || "All Venues"}</CardTitle>
          <CardDescription>
            View and export booking data for different time periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Report Up To</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDateToStr(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1.5">
            <Label>For The Last</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                className="w-20"
                value={period.amount}
                onChange={(e) => setPeriod(p => ({ ...p, amount: parseInt(e.target.value, 10) || 1 }))}
              />
              <Select value={period.unit} onValueChange={(v) => setPeriod(p => ({ ...p, unit: v }))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="d">Day(s)</SelectItem>
                  <SelectItem value="w">Week(s)</SelectItem>
                  <SelectItem value="m">Month(s)</SelectItem>
                  <SelectItem value="q">Quarter(s)</SelectItem>
                  <SelectItem value="y">Year(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleDateOrPeriodChange}>Generate Report</Button>
          <div className="flex-grow"></div>
          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export Report</DialogTitle>
                    <DialogDescription>
                        Export the current report view as a PDF or CSV file, or send it via email.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={handleExportPdf} className="w-full">
                            <Download className="mr-2 h-4 w-4" /> Download as PDF
                        </Button>
                        <Button onClick={handleExportCsv} className="w-full" variant="secondary">
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as CSV
                        </Button>
                    </div>
                     <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Send to Email (with CSV attached)</Label>
                        <div className="flex gap-2">
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <Button variant="secondary" onClick={handleSendEmail} disabled={isEmailPending}>
                                {isEmailPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsExportOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

        </CardContent>
      </Card>
      
      <Tabs defaultValue="guest">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guest"><Users className="mr-2 h-4 w-4"/>Group by Guest</TabsTrigger>
          <TabsTrigger value="status"><Milestone className="mr-2 h-4 w-4"/>Group by Status</TabsTrigger>
          <TabsTrigger value="unit"><Warehouse className="mr-2 h-4 w-4"/>Group by Unit</TabsTrigger>
        </TabsList>
        <TabsContent value="guest" className="space-y-4">
          {Object.entries(groupedData.guest).sort(([a], [b]) => a.localeCompare(b)).map(([guest, bookings]) => (
            <ReportTable key={guest} bookings={bookings} title={guest} />
          ))}
        </TabsContent>
        <TabsContent value="status" className="space-y-4">
          {Object.entries(groupedData.status).map(([status, bookings]) => (
            <ReportTable key={status} bookings={bookings} title={status} />
          ))}
        </TabsContent>
        <TabsContent value="unit" className="space-y-4">
          {Object.entries(groupedData.unit).sort(([a], [b]) => a.localeCompare(b)).map(([unit, bookings]) => (
            <ReportTable key={unit} bookings={bookings} title={unit} />
          ))}
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>
            A summary of all financial transactions for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Total Owed</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-medium">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-accent" />
                    <span>{financialSummary.active.count} Active & Completed Booking(s)</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.active.totalPaid, listing?.currency || 'NGN')}</TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.active.totalOwed, listing?.currency || 'NGN')}</TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.active.balance, listing?.currency || 'NGN')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                   <div className="flex items-center gap-2">
                    <XOctagon className="h-4 w-4 text-destructive" />
                    <span>{financialSummary.cancelled.count} Cancelled Booking(s)</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.cancelled.totalPaid, listing?.currency || 'NGN')}</TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.cancelled.totalOwed, listing?.currency || 'NGN')}</TableCell>
                <TableCell className="text-right">{formatCurrency(financialSummary.cancelled.balance, listing?.currency || 'NGN')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}



