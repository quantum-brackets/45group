import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EVENT_BOOKING_DAILY_HRS } from '@/lib/constants';
import type { Booking, Listing } from '@/lib/types';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  Banknote,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Home,
  MapPin,
  Percent,
  Receipt,
  User as UserIcon,
  Users,
} from 'lucide-react';
import React, { useMemo } from 'react';

interface BookingSummaryProps {
  booking: Booking;
  listing: Listing;
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export const BookingSummary = ({ booking, listing }: BookingSummaryProps) => {
  const { baseBookingCost, discountAmount, addedBillsTotal, totalBill, totalPayments, balance } = useMemo(() => {
    const from = parseISO(booking.startDate);
    const originalEndDate = parseISO(booking.endDate);
    const to = originalEndDate;

    const units = (booking.inventoryIds || []).length;
    const guests = booking.guests;

    const durationDays = differenceInCalendarDays(to, from) + 1;
    const nights = durationDays > 1 ? durationDays - 1 : 1;

    let baseBookingCost = 0;
    switch (listing.price_unit) {
      case 'night':
        baseBookingCost = listing.price * nights * units;
        break;
      case 'hour':
        baseBookingCost =
          listing.price * durationDays * EVENT_BOOKING_DAILY_HRS * units;
        break;
      case 'person':
        baseBookingCost = listing.price * guests * units;
        break;
      default:
        baseBookingCost = 0;
    }

    const discountAmount = ((booking.discount || 0) * baseBookingCost) / 100;
    const addedBillsTotal = (booking.bills || []).reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
    const totalBill = baseBookingCost + addedBillsTotal;
    const totalPayments =
      (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) +
      discountAmount;
    const balance = totalBill - totalPayments;

    return {
      baseBookingCost,
      discountAmount,
      addedBillsTotal,
      totalBill,
      totalPayments,
      balance,
    };
  }, [booking, listing]);
  
  const typeIcon = {
    hotel: <Home className="h-4 w-4" />,
    events: <Building2 className="h-4 w-4" />,
    restaurant: <Banknote className="h-4 w-4" />,
  };

  return (
    <div className="bg-white text-black font-sans p-8" id={`booking-summary-${booking.id}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{listing.name}</h1>
          <p className="text-gray-500">Booking Summary</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-800">Booking ID</p>
          <p className="font-mono text-sm text-gray-500">{booking.id}</p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 text-sm">
        <div className="flex items-start gap-3">
          <UserIcon className="h-5 w-5 text-gray-500 mt-1" />
          <div>
            <p className="font-bold text-gray-600">Guest</p>
            <p className="text-gray-800">{booking.userName}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-gray-500 mt-1" />
          <div>
            <p className="font-bold text-gray-600">Location</p>
            <p className="text-gray-800">{listing.location}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-gray-500 mt-1" />
          <div>
            <p className="font-bold text-gray-600">Dates</p>
            <p className="text-gray-800">
              {format(parseISO(booking.startDate), 'MMM d, yyyy')} -{' '}
              {format(parseISO(booking.endDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-gray-500 mt-1" />
          <div>
            <p className="font-bold text-gray-600">Details</p>
            <p className="text-gray-800">
              {booking.guests} Guest(s), {booking.inventoryIds.length} Unit(s)
            </p>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Financial Summary
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Bills */}
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gray-600" />
              Charges
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-600">Description</TableHead>
                  <TableHead className="text-right text-gray-600">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Base Booking Cost</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(baseBookingCost, listing.currency)}
                  </TableCell>
                </TableRow>
                {booking.bills?.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.description}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(bill.amount, listing.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Payments */}
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-600" />
              Credits & Payments
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-600">Description</TableHead>
                  <TableHead className="text-right text-gray-600">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booking.discount && booking.discount > 0 ? (
                  <TableRow>
                    <TableCell className="font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Discount ({booking.discount}%)
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(discountAmount, listing.currency)}
                    </TableCell>
                  </TableRow>
                ) : null}
                {booking.payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.amount, listing.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-8 pt-4 border-t-2 border-gray-200 text-right">
        <div className="space-y-2 max-w-sm ml-auto text-sm">
            <div className="flex justify-between">
                <span className="text-gray-600">Total Charges:</span>
                <span className="font-medium">{formatCurrency(totalBill, listing.currency)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Total Payments:</span>
                <span className="text-green-600 font-medium">{formatCurrency(totalPayments, listing.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span className="text-gray-800">Final Balance:</span>
                <span className={balance > 0 ? 'text-red-600' : 'text-gray-800'}>
                    {formatCurrency(balance, listing.currency)}
                </span>
            </div>
        </div>
      </div>

       {/* Footer */}
       <div className="mt-12 text-center text-xs text-gray-400">
            <p>Thank you for choosing {listing.name}.</p>
            <p>Generated on {format(new Date(), 'PPp')}</p>
        </div>
    </div>
  );
};
