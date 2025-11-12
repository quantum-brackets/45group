
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isWithinInterval,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Download,
  Send,
  Users,
  Warehouse,
  Milestone,
  Loader2,
  Home,
  BarChart,
  XOctagon,
  FileSpreadsheet,
  ChevronsUpDown,
  Check,
  CalendarArrowDown,
  CalendarArrowUp,
} from "lucide-react";

import type { Booking, Listing, Payment, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, parseDate, formatDateToStr, formatCurrency } from "@/lib/utils";
import { sendReportEmailAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { EVENT_BOOKING_DAILY_HRS } from "@/lib/constants";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

interface ListingReportProps {
  listing?: Listing; // Optional: for single-listing reports
  location?: string; // Optional: for location-based reports
  allListings: Listing[];
  initialBookings: Booking[];
  initialDateRange: { from: string; to: string };
  initialPeriod: { unit: string; amount: number };
  session: User | null;
}

type Grouping = "status" | "guest" | "unit" | "startDate" | "endDate";

const calculateBookingFinancials = (booking: Booking, listing?: Listing) => {
  const from = parseDate(booking.startDate);
  const to = parseDate(booking.endDate);

  const units = (booking.inventoryIds || []).length;
  const guests = booking.guests;
  const durationDays = differenceInCalendarDays(to, from) + 1;
  const nights = durationDays > 1 ? durationDays - 1 : 1;
  let baseBookingCost = 0;

  // For global reports, pricing info is attached to the booking object itself.
  // For single-listing reports, it's on the listing object.
  const price = booking.price ?? listing?.price ?? 0;
  const price_unit = booking.price_unit ?? listing?.price_unit ?? "night";

  switch (price_unit) {
    case "night":
      baseBookingCost = price * nights * units;
      break;
    case "hour":
      baseBookingCost = price * durationDays * EVENT_BOOKING_DAILY_HRS * units;
      break;
    case "person":
      baseBookingCost = price * guests * units;
      break;
  }
  const discountAmount = (baseBookingCost * (booking.discount || 0)) / 100;
  const addedBillsTotal = (booking.bills || []).reduce(
    (sum, bill) => sum + bill.amount,
    0
  );
  const totalBill = baseBookingCost + addedBillsTotal;
  const totalPayments =
    (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) +
    discountAmount;
  const balance = totalBill - totalPayments;

  return { totalBill, totalPayments, balance, stayDuration: durationDays };
};

export function ListingReport({
  listing,
  location,
  allListings,
  initialBookings,
  initialDateRange,
  initialPeriod,
  session,
}: ListingReportProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [date, setDate] = useState<string | undefined>(initialDateRange.to);
  const [period, setPeriod] = useState(initialPeriod);
  const [isEmailPending, startEmailTransition] = useTransition();
  const [email, setEmail] = useState(session?.email || "");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isScopeOpen, setIsScopeOpen] = useState(false);

  const uniqueLocations = useMemo(() => {
    return [
      ...new Set(
        allListings.map((l) => l.location).sort((a, b) => a.localeCompare(b))
      ),
    ];
  }, [allListings]);

  const reportTitle =
    listing?.name ||
    (location ? `Location: ${decodeURIComponent(location)}` : "All Venues");

  const currentScopeValue = useMemo(() => {
    if (listing) return `listing:${listing.id}`;
    if (location) return `location:${location}`;
    return "all";
  }, [listing, location]);

  const bookingsWithFinancials = useMemo(() => {
    // For global reports, the listing context is on each booking.
    return initialBookings.map((b) => ({
      ...b,
      financials: calculateBookingFinancials(b, listing),
    }));
  }, [initialBookings, listing]);

  const financialSummary = useMemo(() => {
    const summary = {
      active: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
      cancelled: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
    };

    bookingsWithFinancials.forEach((booking) => {
      const target =
        booking.status === "Cancelled" ? summary.cancelled : summary.active;
      target.count += 1;
      target.totalPaid += booking.financials.totalPayments;
      target.totalOwed += booking.financials.totalBill;
      target.balance += booking.financials.balance;
    });

    return summary;
  }, [bookingsWithFinancials]);

  const groupedData = useMemo(() => {
    const statusOrder: Booking["status"][] = [
      "Confirmed",
      "Pending",
      "Completed",
      "Cancelled",
    ];
    const groupings: Record<
      Grouping,
      Record<string, typeof bookingsWithFinancials>
    > = {
      status: {},
      guest: {},
      unit: {},
      startDate: {},
      endDate: {},
    };

    bookingsWithFinancials.forEach((booking) => {
      // Group by Status
      if (!groupings.status[booking.status])
        groupings.status[booking.status] = [];
      groupings.status[booking.status].push(booking);

      // Group by Guest
      const guestName = booking.userName || "Unknown Guest";
      if (!groupings.guest[guestName]) groupings.guest[guestName] = [];
      groupings.guest[guestName].push(booking);

      // Group by Unit
      (booking.inventoryNames || ["Unassigned"]).forEach((unitName) => {
        if (!groupings.unit[unitName]) groupings.unit[unitName] = [];
        groupings.unit[unitName].push(booking);
      });

      // Group by Start Date
      const startDate = booking.startDate;
      if (!groupings.startDate[startDate]) groupings.startDate[startDate] = [];
      groupings.startDate[startDate].push(booking);

      // Group by End Date
      const endDate = booking.endDate;
      if (!groupings.endDate[endDate]) groupings.endDate[endDate] = [];
      groupings.endDate[endDate].push(booking);
    });

    const sortedStatusGroup = Object.fromEntries(
      Object.entries(groupings.status).sort(([a], [b]) => {
        return (
          statusOrder.indexOf(a as Booking["status"]) -
          statusOrder.indexOf(b as Booking["status"])
        );
      })
    );
    
    const sortedStartDateGroup = Object.fromEntries(
        Object.entries(groupings.startDate).sort(([a], [b]) => a.localeCompare(b))
    );

    const sortedEndDateGroup = Object.fromEntries(
        Object.entries(groupings.endDate).sort(([a], [b]) => a.localeCompare(b))
    );

    return {
      status: sortedStatusGroup,
      guest: groupings.guest,
      unit: groupings.unit,
      startDate: sortedStartDateGroup,
      endDate: sortedEndDateGroup,
    };
  }, [bookingsWithFinancials]);

  const handleDateOrPeriodChange = () => {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const periodString = `${period.amount}${period.unit}`;

    // Use the current pathname to rebuild the URL, preserving the scope (listing, location, or global)
    const currentPathSegments = pathname.split("/");
    // e.g. /reports/listing/some-id/2024-01-01/1m -> /reports/listing/some-id/
    // e.g. /reports/location/some-loc/2024-01-01/1m -> /reports/location/some-loc/
    // e.g. /reports/2024-01-01/1m -> /reports/
    const basePath = currentPathSegments.slice(0, -2).join("/");

    router.push(
      `${basePath}/${targetDate}/${periodString}`
    );
  };

  const handleScopeChange = (newPath: string) => {
    setIsScopeOpen(false);
    const dateStr = date || new Date().toISOString().split("T")[0];
    const periodStr = `${period.amount}${period.unit}`;
    router.push(`${newPath}/${dateStr}/${periodStr}`);
  };

  const getCsvData = () => {
    const headers = [
      "Booking ID",
      "Guest",
      "Venue",
      "Units",
      "Start Date",
      "End Date",
      "Duration (days)",
      "Paid",
      "Owed",
      "Balance",
      "Status",
      "Currency",
    ];
    const currencyCode =
      listing?.currency || initialBookings[0]?.currency || "NGN";

    const rows = bookingsWithFinancials.map((b) =>
      [
        b.id,
        b.userName,
        b.listingName,
        b.inventoryNames?.join(", ") || "N/A",
        b.startDate,
        b.endDate,
        b.financials.stayDuration,
        b.financials.totalPayments.toFixed(2),
        b.financials.totalBill.toFixed(2),
        b.financials.balance.toFixed(2),
        b.status,
        currencyCode,
      ]
        .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
        .join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  };

  const handleExportCsv = () => {
    const csvContent = getCsvData();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const reportDate =
        initialDateRange?.to || initialDateRange?.from;
      const periodString = `${initialPeriod.amount}${initialPeriod.unit}`;
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `report_${(listing?.name || "all").replace(
          /\s+/g,
          "_"
        )}_${reportDate}_${periodString}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportOpen(false);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const currencyCode =
      listing?.currency || initialBookings[0]?.currency || "NGN";

    doc.setFontSize(18);
    doc.text(`Booking Report for ${reportTitle}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateDisplay = initialDateRange?.from
      ? `${initialDateRange.from} - ${initialDateRange.to}`
      : "All time";
    doc.text(`Period: ${dateDisplay}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Guest",
          "Venue",
          "Units",
          "Start Date",
          "Duration (days)",
          "Paid",
          "Owed",
          "Balance",
          "Status",
        ],
      ],
      body: bookingsWithFinancials.map((b) => [
        b.userName,
        b.listingName,
        b.inventoryNames?.join(", ") || "N/A",
        b.startDate,
        b.financials.stayDuration,
        formatCurrency(b.financials.totalPayments, currencyCode),
        formatCurrency(b.financials.totalBill, currencyCode),
        formatCurrency(b.financials.balance, currencyCode),
        b.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [211, 76, 35] },
    });

    let finalY = (doc as any).lastAutoTable.finalY || 10;

    // --- Daily Summary Section ---
    const dailyData = getDailySummaryData();
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Daily Summary", 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Date",
          "Units Used",
          "Daily Charge",
          "Paid (Cash)",
          "Paid (Transfer)",
          "Paid (Debit)",
          "Paid (Credit)",
          "Owed",
        ],
      ],
      body: Object.values(dailyData).map((day) => [
        day.date,
        day.unitsUsed,
        formatCurrency(day.dailyCharge, currencyCode),
        formatCurrency(day.payments.Cash, currencyCode),
        formatCurrency(day.payments.Transfer, currencyCode),
        formatCurrency(day.payments.Debit, currencyCode),
        formatCurrency(day.payments.Credit, currencyCode),
        formatCurrency(day.balance, currencyCode),
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 139, 34] },
    });
    finalY = (doc as any).lastAutoTable.finalY || finalY;

    // --- Financial Summary Section ---
    doc.setFontSize(14);
    doc.text("Financial Summary", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Category", "Total Paid", "Total Owed", "Balance"]],
      body: [
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
      ],
      theme: "grid",
    });

    const reportDate =
      initialDateRange?.to || initialDateRange?.from;
    const periodString = `${initialPeriod.amount}${initialPeriod.unit}`;
    doc.save(
      `report_${(listing?.name || "all").replace(
        /\s+/g,
        "_"
      )}_${reportDate}_${periodString}.pdf`
    );
    setIsExportOpen(false);
  };

  const getDailySummaryData = () => {
    const dailyData: Record<
      string,
      {
        date: string;
        unitsUsed: number;
        dailyCharge: number;
        payments: Record<Payment["method"], number>;
        totalPaid: number;
        balance: number;
      }
    > = {};
    if (!initialDateRange?.from || !initialDateRange?.to) return dailyData;

    const reportDays = eachDayOfInterval({
      start: parseDate(initialDateRange.from!),
      end: parseDate(initialDateRange.to!),
    });

    reportDays.forEach((day) => {
      const dayStr = formatDateToStr(day);
      dailyData[dayStr] = {
        date: dayStr,
        unitsUsed: 0,
        dailyCharge: 0,
        payments: { Cash: 0, Transfer: 0, Debit: 0, Credit: 0 },
        totalPaid: 0,
        balance: 0,
      };
    });

    initialBookings.forEach((booking) => {
      const listingForBooking = {
        price: booking.price,
        price_unit: booking.price_unit,
        ...listing,
      };
      const bookingDays = eachDayOfInterval({
        start: parseDate(booking.startDate),
        end: parseDate(booking.endDate),
      });

      const bookingDuration =
        differenceInCalendarDays(
          parseDate(booking.endDate),
          parseDate(booking.startDate)
        ) || 1;
      const dailyRate = (listingForBooking.price || 0) / bookingDuration;

      bookingDays.forEach((day) => {
        if (
          isWithinInterval(day, {
            start: parseDate(initialDateRange.from!),
            end: addDays(parseDate(initialDateRange.to!), 1),
          })
        ) {
          const dayStr = formatDateToStr(day);
          if (dailyData[dayStr]) {
            dailyData[dayStr].unitsUsed += (booking.inventoryIds || []).length;
            dailyData[dayStr].dailyCharge +=
              dailyRate * (booking.inventoryIds || []).length;
          }
        }
      });

      (booking.payments || []).forEach((payment) => {
        const paymentDayStr = formatDateToStr(
          parseDate(payment.timestamp)
        );
        if (dailyData[paymentDayStr]) {
          dailyData[paymentDayStr].payments[payment.method] =
            (dailyData[paymentDayStr].payments[payment.method] || 0) +
            payment.amount;
          dailyData[paymentDayStr].totalPaid += payment.amount;
        }
      });
    });

    Object.values(dailyData).forEach((day) => {
      day.balance = day.dailyCharge - day.totalPaid;
    });

    return dailyData;
  };

  const handleSendEmail = () => {
    startEmailTransition(async () => {
      // For a global report, listingId is null. The server action needs to handle this.
      const result = await sendReportEmailAction({
        listingId: listing?.id,
        fromDate: initialDateRange.from,
        toDate: initialDateRange.to,
        email,
      });

      if (result.success) {
        toast({
          title: "Report Sent!",
          description: result.message,
        });
        setIsExportOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const getStatusBadge = (status: Booking["status"]) => {
    const variants = {
      Confirmed: "default",
      Pending: "secondary",
      Cancelled: "destructive",
      Completed: "outline",
    } as const;

    const styles = {
      Confirmed: "bg-accent text-accent-foreground",
      Completed: "bg-blue-500 text-white border-blue-500",
    };

    return (
      <Badge
        variant={variants[status] || "secondary"}
        className={cn(styles[status as keyof typeof styles])}
      >
        {status}
      </Badge>
    );
  };

  const ReportTable = ({
    bookings,
    title,
  }: {
    bookings: typeof bookingsWithFinancials;
    title: string;
  }) => (
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
            {bookings.map((b) => (
              <TableRow
                key={b.id}
                onClick={() => router.push(`/booking/${b.id}`)}
                className="cursor-pointer"
              >
                <TableCell>{b.userName}</TableCell>
                {!listing && <TableCell>{b.listingName}</TableCell>}
                <TableCell>{b.inventoryNames?.join(", ") || "N/A"}</TableCell>
                <TableCell>
                  {formatDateToStr(b.startDate, "MMM d")} -{" "}
                  {formatDateToStr(b.endDate, "MMM d, yyyy")} (
                  {b.financials.stayDuration}d)
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(
                    b.financials.totalPayments,
                    b.currency || listing?.currency || "NGN"
                  )}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    b.financials.balance > 0 ? "text-destructive" : ""
                  }`}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {formatCurrency(
                    b.financials.balance,
                    b.currency || listing?.currency || "NGN"
                  )}
                </TableCell>
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle>Booking Report</CardTitle>
              <CardDescription>
                View and export booking data for different time periods.
              </CardDescription>
            </div>
            <Popover open={isScopeOpen} onOpenChange={setIsScopeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isScopeOpen}
                  className="w-full md:w-[250px] justify-between"
                >
                  <span className="truncate">{reportTitle}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search scope..." />
                  <CommandList>
                    <CommandEmpty>No scope found.</CommandEmpty>
                    <CommandGroup heading="Global">
                      <CommandItem
                        value="All Reports"
                        onSelect={() => handleScopeChange("/reports")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentScopeValue === "all"
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        All Reports
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="By Location">
                      {uniqueLocations.map((loc) => (
                        <CommandItem
                          key={loc}
                          value={loc}
                          onSelect={() =>
                            handleScopeChange(
                              `/reports/location/${encodeURIComponent(loc)}`
                            )
                          }
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentScopeValue === `location:${loc}`
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {loc}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="By Listing">
                      {allListings.map((l) => (
                        <CommandItem
                          key={l.id}
                          value={l.name}
                          onSelect={() =>
                            handleScopeChange(`/reports/listing/${l.id}`)
                          }
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentScopeValue === `listing:${l.id}`
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {l.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="grid gap-1.5">
            <Label>Report Up To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    formatDateToStr(date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date ? parseDate(date) : undefined}
                  onSelect={(d) => setDate(d ? formatDateToStr(d) : undefined)}
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
                onChange={(e) =>
                  setPeriod((p) => ({
                    ...p,
                    amount: parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
              <Select
                value={period.unit}
                onValueChange={(v) => setPeriod((p) => ({ ...p, unit: v }))}
              >
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
                  Export the current report view as a PDF or CSV file, or send
                  it via email.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleExportPdf} className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download as PDF
                  </Button>
                  <Button
                    onClick={handleExportCsv}
                    className="w-full"
                    variant="secondary"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Download as CSV
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Send to Email (with CSV attached)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleSendEmail}
                      disabled={isEmailPending}
                    >
                      {isEmailPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}{" "}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsExportOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Tabs defaultValue="guest">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="guest">
            <Users className="mr-2 h-4 w-4" />
            Group by Guest
          </TabsTrigger>
          <TabsTrigger value="status">
            <Milestone className="mr-2 h-4 w-4" />
            Group by Status
          </TabsTrigger>
          <TabsTrigger value="unit">
            <Warehouse className="mr-2 h-4 w-4" />
            Group by Unit
          </TabsTrigger>
          <TabsTrigger value="startDate">
            <CalendarArrowDown className="mr-2 h-4 w-4" />
            Group by Start Date
          </TabsTrigger>
          <TabsTrigger value="endDate">
            <CalendarArrowUp className="mr-2 h-4 w-4" />
            Group by End Date
          </TabsTrigger>
        </TabsList>
        <TabsContent value="guest" className="space-y-4">
          {Object.entries(groupedData.guest)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([guest, bookings]) => (
              <ReportTable key={guest} bookings={bookings} title={guest} />
            ))}
        </TabsContent>
        <TabsContent value="status" className="space-y-4">
          {Object.entries(groupedData.status).map(([status, bookings]) => (
            <ReportTable key={status} bookings={bookings} title={status} />
          ))}
        </TabsContent>
        <TabsContent value="unit" className="space-y-4">
          {Object.entries(groupedData.unit)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([unit, bookings]) => (
              <ReportTable key={unit} bookings={bookings} title={unit} />
            ))}
        </TabsContent>
        <TabsContent value="startDate" className="space-y-4">
          {Object.entries(groupedData.startDate).map(
            ([date, bookings]) => (
              <ReportTable
                key={date}
                bookings={bookings}
                title={`Starting on ${formatDateToStr(date, "PPP")}`}
              />
            )
          )}
        </TabsContent>
        <TabsContent value="endDate" className="space-y-4">
          {Object.entries(groupedData.endDate).map(([date, bookings]) => (
            <ReportTable
              key={date}
              bookings={bookings}
              title={`Ending on ${formatDateToStr(date, "PPP")}`}
            />
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
                    <span>
                      {financialSummary.active.count} Active & Completed
                      Booking(s)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.active.totalPaid,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.active.totalOwed,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.active.balance,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <XOctagon className="h-4 w-4 text-destructive" />
                    <span>
                      {financialSummary.cancelled.count} Cancelled Booking(s)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.cancelled.totalPaid,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.cancelled.totalOwed,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    financialSummary.cancelled.balance,
                    listing?.currency || "NGN"
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
