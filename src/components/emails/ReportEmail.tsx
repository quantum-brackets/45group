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
  import type { Booking, Listing } from '@/lib/types';
  import { formatDateToStr, toZonedTimeSafe } from '@/lib/utils';
  import { differenceInCalendarDays } from 'date-fns';
  
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
  
    const totals = bookingsWithFinancials.reduce((acc, curr) => {
      acc.totalPaid += curr.financials.totalPayments;
      acc.totalOwed += curr.financials.totalBill;
      acc.totalBalance += curr.financials.balance;
      return acc;
    }, { totalPaid: 0, totalOwed: 0, totalBalance: 0 });
    
    // Assume a default currency if no single listing is provided
    const currency = listing?.currency || 'NGN';
  
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
  
            <Heading as="h2" style={subHeading}>Summary</Heading>
            <Section style={summarySection}>
                <Row>
                    <Column style={summaryCell}><span style={summaryTitle}>Total Bookings</span><br/>{bookings.length}</Column>
                    <Column style={summaryCell}><span style={summaryTitle}>Total Paid</span><br/>{formatCurrency(totals.totalPaid, currency)}</Column>
                    <Column style={summaryCell}><span style={summaryTitle}>Outstanding Balance</span><br/>{formatCurrency(totals.totalBalance, currency)}</Column>
                </Row>
            </Section>
            
            <Heading as="h2" style={subHeading}>Details</Heading>
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
      padding: '0 20px',
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
  
