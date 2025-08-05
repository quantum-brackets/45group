import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Row,
    Column,
  } from '@react-email/components';
  import * as React from 'react';
  import type { Booking, Listing, Payment } from '@/lib/types';
  import { formatDateToStr, toZonedTimeSafe } from '@/lib/utils';
  import { addDays, differenceInCalendarDays, eachDayOfInterval, isWithinInterval } from 'date-fns';
  
  export interface ReportEmailProps {
    listing: Listing | null; // Can be null for global reports
    bookings: Booking[];
    dateRange: { from: Date; to: Date };
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
  
  const calculateBookingFinancials = (booking: Booking, listing: Listing | null) => {
      const from = toZonedTimeSafe(booking.startDate);
      let to = (booking.status === 'Completed' || booking.status === 'Cancelled') ? toZonedTimeSafe(booking.endDate) : toZonedTimeSafe(new Date());
      if (to < from) to = from;
  
      const units = (booking.inventoryIds || []).length;
      const guests = booking.guests;
      const durationDays = differenceInCalendarDays(to, from) + 1;
      const nights = durationDays > 1 ? durationDays - 1 : 1;
      let baseBookingCost = 0;

      // For global reports, we don't have a single listing context, so we have to make some assumptions
      // or handle this differently if currencies can vary. Assuming a default for now.
      const price = listing?.price || 0;
      const price_unit = listing?.price_unit || 'night';

      switch(price_unit) {
          case 'night': baseBookingCost = price * nights * units; break;
          case 'hour': baseBookingCost = price * durationDays * 10 * units; break;
          case 'person': baseBookingCost = price * guests * units; break;
      }
      const discountAmount = baseBookingCost * (booking.discount || 0) / 100;
      const addedBillsTotal = (booking.bills || []).reduce((sum, bill) => sum + bill.amount, 0);
      const totalBill = baseBookingCost + addedBillsTotal;
      const totalPayments = (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) + discountAmount;
      const balance = totalBill - totalPayments;
      
      return { totalBill, totalPayments, balance, stayDuration: durationDays };
  }
  
  export const ReportEmail = ({ listing, bookings, dateRange }: ReportEmailProps) => {
  
    const bookingsWithFinancials = bookings.map(b => ({
      ...b,
      financials: calculateBookingFinancials(b, listing)
    }));
  
    const financialSummary = bookingsWithFinancials.reduce((acc, booking) => {
        const target = booking.status === 'Cancelled' ? acc.cancelled : acc.active;
        target.count += 1;
        target.totalPaid += booking.financials.totalPayments;
        target.totalOwed += booking.financials.totalBill;
        target.balance += booking.financials.balance;
        return acc;
    }, {
        active: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
        cancelled: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
    });
    
    // Assume a default currency if no single listing is provided
    const currency = listing?.currency || 'NGN';

    // Daily Aggregation Logic
    const dailyData: Record<string, { date: string; unitsUsed: number; dailyCharge: number; payments: Record<Payment['method'], number>; totalPaid: number; balance: number }> = {};
    const reportDays = eachDayOfInterval({ start: toZonedTimeSafe(dateRange.from), end: toZonedTimeSafe(dateRange.to) });

    reportDays.forEach(day => {
        const dayStr = formatDateToStr(day, 'yyyy-MM-dd');
        dailyData[dayStr] = {
            date: dayStr,
            unitsUsed: 0,
            dailyCharge: 0,
            payments: { Cash: 0, Transfer: 0, Debit: 0, Credit: 0 },
            totalPaid: 0,
            balance: 0,
        };
    });

    bookings.forEach(booking => {
        const listingForBooking = { price: booking.price, price_unit: booking.price_unit, ...listing };
        const bookingDays = eachDayOfInterval({ start: toZonedTimeSafe(booking.startDate), end: toZonedTimeSafe(booking.endDate) });

        const dailyRate = (listingForBooking.price || 0) / (differenceInCalendarDays(toZonedTimeSafe(booking.endDate), toZonedTimeSafe(booking.startDate)) || 1);

        bookingDays.forEach(day => {
            if (isWithinInterval(day, { start: toZonedTimeSafe(dateRange.from), end: addDays(toZonedTimeSafe(dateRange.to), 1) })) {
                const dayStr = formatDateToStr(day, 'yyyy-MM-dd');
                if (dailyData[dayStr]) {
                    dailyData[dayStr].unitsUsed += (booking.inventoryIds || []).length;
                    dailyData[dayStr].dailyCharge += dailyRate * (booking.inventoryIds || []).length;
                }
            }
        });

        (booking.payments || []).forEach(payment => {
            const paymentDayStr = formatDateToStr(toZonedTimeSafe(payment.timestamp), 'yyyy-MM-dd');
            if (dailyData[paymentDayStr]) {
                dailyData[paymentDayStr].payments[payment.method] = (dailyData[paymentDayStr].payments[payment.method] || 0) + payment.amount;
                dailyData[paymentDayStr].totalPaid += payment.amount;
            }
        });
    });

    Object.values(dailyData).forEach(day => {
        day.balance = day.dailyCharge - day.totalPaid;
    });

    return (
      <Html>
        <Head />
        <Preview>Report for {listing?.name || 'All Venues'} from {formatDateToStr(dateRange.from, 'PPP')}</Preview>
        <Body style={main}>
          <Container style={container}>
            <Img
              src={`${baseUrl}/icon.svg`}
              width="48"
              height="48"
              alt="45 Booking Logo"
            />
            <Heading style={heading}>Booking Report</Heading>
            <Section style={detailsSection}>
              <Row>
                <Column style={column}>
                  <Text style={detailTitle}>Venue</Text>
                  <Text style={detailText}>{listing?.name || 'All Venues'}</Text>
                </Column>
                <Column style={column}>
                  <Text style={detailTitle}>Date Range</Text>
                  <Text style={detailText}>{formatDateToStr(dateRange.from, 'PPP')} - {formatDateToStr(dateRange.to, 'PPP')}</Text>
                </Column>
              </Row>
            </Section>
  
            <Heading as="h2" style={subHeading}>Financial Summary</Heading>
            <table style={table} cellPadding={0} cellSpacing={0}>
                <thead style={tableHead}>
                    <tr>
                        <th style={tableCell}>Category</th>
                        <th style={tableCell}>Total Paid</th>
                        <th style={tableCell}>Total Owed</th>
                        <th style={tableCell}>Balance</th>
                    </tr>
                </thead>
                <tbody style={tableBody}>
                    <tr>
                        <td style={tableCell}>{financialSummary.active.count} Active/Completed Booking(s)</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.active.totalPaid, currency)}</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.active.totalOwed, currency)}</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.active.balance, currency)}</td>
                    </tr>
                     <tr>
                        <td style={tableCell}>{financialSummary.cancelled.count} Cancelled Booking(s)</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.cancelled.totalPaid, currency)}</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.cancelled.totalOwed, currency)}</td>
                        <td style={tableCell}>{formatCurrency(financialSummary.cancelled.balance, currency)}</td>
                    </tr>
                </tbody>
            </table>
            
            <Heading as="h2" style={subHeading}>Booking Details</Heading>
            <table style={table} cellPadding={0} cellSpacing={0}>
              <thead style={tableHead}>
                <tr>
                  <th style={tableCell}>Guest</th>
                  {!listing && <th style={tableCell}>Venue</th>}
                  <th style={tableCell}>Units</th>
                  <th style={tableCell}>Dates</th>
                  <th style={tableCell}>Status</th>
                  <th style={tableCell}>Paid</th>
                  <th style={tableCell}>Balance</th>
                </tr>
              </thead>
              <tbody style={tableBody}>
                {bookingsWithFinancials.map(booking => (
                  <tr key={booking.id}>
                    <td style={tableCell}>{booking.userName}</td>
                    {!listing && <td style={tableCell}>{booking.listingName}</td>}
                    <td style={tableCell}>{booking.inventoryNames?.join(', ')}</td>
                    <td style={tableCell}>{formatDateToStr(booking.startDate, 'MMM d')} - {formatDateToStr(booking.endDate, 'MMM d, yyyy')}</td>
                    <td style={tableCell}>{booking.status}</td>
                    <td style={tableCell}>{formatCurrency(booking.financials.totalPayments, currency)}</td>
                    <td style={tableCell}>{formatCurrency(booking.financials.balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Heading as="h2" style={subHeading}>Daily Summary</Heading>
            <table style={table} cellPadding={0} cellSpacing={0}>
                <thead style={tableHead}>
                    <tr>
                        <th style={tableCell}>Date</th>
                        <th style={tableCell}>Units Used</th>
                        <th style={tableCell}>Daily Charge</th>
                        <th style={tableCell}>Paid (Cash)</th>
                        <th style={tableCell}>Paid (Transfer)</th>
                        <th style={tableCell}>Paid (Debit)</th>
                        <th style={tableCell}>Paid (Credit)</th>
                        <th style={tableCell}>Owed</th>
                    </tr>
                </thead>
                <tbody style={tableBody}>
                    {Object.values(dailyData).map(day => (
                        <tr key={day.date}>
                            <td style={tableCell}>{formatDateToStr(day.date, 'MMM d, yyyy')}</td>
                            <td style={tableCell}>{day.unitsUsed}</td>
                            <td style={tableCell}>{formatCurrency(day.dailyCharge, currency)}</td>
                            <td style={tableCell}>{formatCurrency(day.payments.Cash, currency)}</td>
                            <td style={tableCell}>{formatCurrency(day.payments.Transfer, currency)}</td>
                            <td style={tableCell}>{formatCurrency(day.payments.Debit, currency)}</td>
                            <td style={tableCell}>{formatCurrency(day.payments.Credit, currency)}</td>
                            <td style={tableCell}>{formatCurrency(day.balance, currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <Hr style={hr} />
            <Text style={footer}>
              Generated on {formatDateToStr(new Date(), 'PPP')}
            </Text>
          </Container>
        </Body>
      </Html>
    )
  };
  
  export default ReportEmail;
  
  // Styles
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  };
  
  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '800px',
  };
  
  const heading = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginTop: '48px',
    textAlign: 'center' as const,
    color: '#333',
  };
  
  const subHeading = {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#d34c23',
      padding: '20px 20px 10px 20px',
  };
  
  const detailsSection = {
      border: '1px solid #e6e6e6',
      borderRadius: '5px',
      padding: '20px',
      margin: '20px',
  }
  
  const column = {
      width: '50%',
      paddingBottom: '10px',
  }
  
  const detailTitle = {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#484848',
      margin: '0',
  }
  
  const detailText = {
      fontSize: '14px',
      color: '#484848',
      margin: '0',
  }
  
  const summarySection = {
      textAlign: 'center' as const,
      margin: '0 20px 20px 20px',
      border: '1px solid #e6e6e6',
      borderRadius: '5px',
  }

  const summaryCell = {
      padding: '10px',
  }
  
  const summaryTitle = {
      fontWeight: 'bold',
      color: '#555',
  }
  
  const table = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    padding: '0 20px',
    marginBottom: '20px'
  };
  
  const tableHead = {
    backgroundColor: '#f0f0f0',
  };
  
  const tableBody = {
    
  };
  
  const tableCell = {
    padding: '8px 12px',
    borderBottom: '1px solid #e6e6e6',
    textAlign: 'left' as const,
    fontSize: '12px',
  };
  
  const hr = {
    borderColor: '#e6e6e6',
    margin: '20px 0',
  };
  
  const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
  };
  
