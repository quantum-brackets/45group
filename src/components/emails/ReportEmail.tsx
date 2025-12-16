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

export interface ReportEmailProps {
  listing: Listing | null; // Can be null for global reports
  dateRange: { from: string; to: string };
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const ReportEmail = ({
  listing,
  dateRange,
}: ReportEmailProps) => {
  
  return (
    <Html>
      <Head />
      <Preview>
        Report for {listing?.name || "All Venues"} from {dateRange.from} to {dateRange.to}
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
          <Text style={paragraph}>
            Attached you will find the requested booking reports:
          </Text>
          <ul>
            <li style={paragraph}>- Guest Occupancy Report</li>
            <li style={paragraph}>- Sales Report</li>
            <li style={paragraph}>- Record of Payments</li>
          </ul>
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
  maxWidth: "600px",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "48px",
  textAlign: "center" as const,
  color: "#333",
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#484848',
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
