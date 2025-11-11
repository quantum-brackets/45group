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
} from "@react-email/components";
import * as React from "react";
import type { Booking, Listing } from "@/lib/types";
import { format } from "date-fns";
import { calculateBookingFinancials, formatCurrency } from "@/lib/utils";

export interface ReportEmailProps {
  listing: Listing | null; // Can be null for global reports
  bookings: Booking[];
  dateRange: { from: string; to: string };
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const ReportEmail = ({
  listing,
  bookings,
  dateRange,
}: ReportEmailProps) => {
  const bookingsWithFinancials = bookings.map((b) => ({
    ...b,
    financials: calculateBookingFinancials(b, listing),
  }));

  const financialSummary = bookingsWithFinancials.reduce(
    (acc, booking) => {
      const target =
        booking.status === "Cancelled" ? acc.cancelled : acc.active;
      target.count += 1;
      target.totalPaid += booking.financials.totalPayments;
      target.totalOwed += booking.financials.totalBill;
      target.balance += booking.financials.balance;
      return acc;
    },
    {
      active: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
      cancelled: { count: 0, totalPaid: 0, totalOwed: 0, balance: 0 },
    }
  );

  // Assume a default currency if no single listing is provided
  const currency = listing?.currency || "NGN";

  return (
    <Html>
      <Head />
      <Preview>
        Report for {listing?.name || "All Venues"} from {dateRange.from}
      </Preview>
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
                <Text style={detailText}>{listing?.name || "All Venues"}</Text>
              </Column>
              <Column style={column}>
                <Text style={detailTitle}>Date Range</Text>
                <Text style={detailText}>
                  {dateRange.from} - {dateRange.to}
                </Text>
              </Column>
            </Row>
          </Section>

          <Heading as="h2" style={subHeading}>
            Financial Summary
          </Heading>
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
                <td style={tableCell}>
                  {financialSummary.active.count} Active/Completed Booking(s)
                </td>
                <td style={tableCell}>
                  {formatCurrency(financialSummary.active.totalPaid, currency)}
                </td>
                <td style={tableCell}>
                  {formatCurrency(financialSummary.active.totalOwed, currency)}
                </td>
                <td style={tableCell}>
                  {formatCurrency(financialSummary.active.balance, currency)}
                </td>
              </tr>
              <tr>
                <td style={tableCell}>
                  {financialSummary.cancelled.count} Cancelled Booking(s)
                </td>
                <td style={tableCell}>
                  {formatCurrency(
                    financialSummary.cancelled.totalPaid,
                    currency
                  )}
                </td>
                <td style={tableCell}>
                  {formatCurrency(
                    financialSummary.cancelled.totalOwed,
                    currency
                  )}
                </td>
                <td style={tableCell}>
                  {formatCurrency(financialSummary.cancelled.balance, currency)}
                </td>
              </tr>
            </tbody>
          </table>

          <Heading as="h2" style={subHeading}>
            Booking Details
          </Heading>
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
              {bookingsWithFinancials.map((booking) => (
                <tr key={booking.id}>
                  <td style={tableCell}>{booking.userName}</td>
                  {!listing && <td style={tableCell}>{booking.listingName}</td>}
                  <td style={tableCell}>
                    {booking.inventoryNames?.join(", ")}
                  </td>
                  <td style={tableCell}>
                    {booking.startDate} - {booking.endDate}
                  </td>
                  <td style={tableCell}>{booking.status}</td>
                  <td style={tableCell}>
                    {formatCurrency(booking.financials.totalPayments, currency)}
                  </td>
                  <td style={tableCell}>
                    {formatCurrency(booking.financials.balance, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Hr style={hr} />
          <Text style={footer}>
            Generated on {format(new Date(), "yyyy-MM-dd")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReportEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "800px",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "48px",
  textAlign: "center" as const,
  color: "#333",
};

const subHeading = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#d34c23",
  padding: "20px 20px 10px 20px",
};

const detailsSection = {
  border: "1px solid #e6e6e6",
  borderRadius: "5px",
  padding: "20px",
  margin: "20px",
};

const column = {
  width: "50%",
  paddingBottom: "10px",
};

const detailTitle = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#484848",
  margin: "0",
};

const detailText = {
  fontSize: "14px",
  color: "#484848",
  margin: "0",
};

const summarySection = {
  textAlign: "center" as const,
  margin: "0 20px 20px 20px",
  border: "1px solid #e6e6e6",
  borderRadius: "5px",
};

const summaryCell = {
  padding: "10px",
};

const summaryTitle = {
  fontWeight: "bold",
  color: "#555",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  padding: "0 20px",
  marginBottom: "20px",
};

const tableHead = {
  backgroundColor: "#f0f0f0",
};

const tableBody = {};

const tableCell = {
  padding: "8px 12px",
  borderBottom: "1px solid #e6e6e6",
  textAlign: "left" as const,
  fontSize: "12px",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
};
