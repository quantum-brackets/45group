import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { format } from 'date-fns';
import type { Booking, Listing, User } from '@/lib/types';
import { BookingSummary, formatCurrency } from '../bookings/BookingSummary';

interface BookingSummaryEmailProps {
  user: User;
  booking: Booking;
  listing: Listing;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://45group.org';

export const BookingSummaryEmail = ({ user, booking, listing }: BookingSummaryEmailProps) => (
  <Html>
    <Head />
    <Preview>Thank you for staying at {listing.name}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/icon.svg`}
          width="48"
          height="48"
          alt="45 Booking Logo"
        />
        <Heading style={heading}>Thank You for Your Stay!</Heading>
        <Text style={paragraph}>Hi {user.name},</Text>
        <Text style={paragraph}>
          We hope you had a wonderful time at **{listing.name}**. Here is a summary of your stay and the final bill.
        </Text>

        <BookingSummary booking={booking} listing={listing} />

        <Hr style={hr} />

        <Section style={buttonContainer}>
          <Button style={button} href={`${baseUrl}/listing/${listing.id}`}>
            Book Again
          </Button>
        </Section>

        <Text style={paragraph}>
          We look forward to welcoming you back soon.
          <br />
          The 45 Booking Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BookingSummaryEmail;

const main = {
  backgroundColor: '#f4f7fa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
  maxWidth: '100%',
};

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginTop: '48px',
  color: '#2aa147',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#484848',
};

const hr = {
  borderColor: '#dddddd',
  marginTop: '32px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#d34c23',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};
