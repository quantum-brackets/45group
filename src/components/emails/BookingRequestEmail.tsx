import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column
} from '@react-email/components';
import * as React from 'react';
import type { Booking, Listing, User } from '@/lib/types';
import { formatDateToStr, toZonedTimeSafe } from '@/lib/utils';
  
  interface BookingRequestEmailProps {
    user: User;
    booking: Booking;
    listing: Listing;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  
  export const BookingRequestEmail = ({ user, booking, listing }: BookingRequestEmailProps) => (
    <Html>
      <Head />
      <Preview>Your Booking Request for {listing.name} Has Been Received</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/icon.svg`}
            width="48"
            height="48"
            alt="45 Booking Logo"
          />
          <Heading style={heading}>Booking Request Received</Heading>
          <Text style={paragraph}>Hi {user.name},</Text>
          <Text style={paragraph}>
            We've received your booking request for **{listing.name}**. Your reservation is now pending and awaits confirmation from our team. We will notify you again once it's confirmed.
          </Text>
  
          <Section style={detailsSection}>
            <Text style={sectionTitle}>Reservation Details</Text>
            <Row>
              <Column style={column}>
                <Text style={detailTitle}>Venue</Text>
                <Text style={detailText}>{listing.name}</Text>
              </Column>
              <Column style={column}>
                <Text style={detailTitle}>Location</Text>
                <Text style={detailText}>{listing.location}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={column}>
                <Text style={detailTitle}>Check-in</Text>
                <Text style={detailText}>{formatDateToStr(toZonedTimeSafe(booking.startDate), 'PPP')}</Text>
              </Column>
              <Column style={column}>
                <Text style={detailTitle}>Check-out</Text>
                <Text style={detailText}>{formatDateToStr(toZonedTimeSafe(booking.endDate), 'PPP')}</Text>
              </Column>
            </Row>
             <Row>
              <Column style={column}>
                <Text style={detailTitle}>Guests</Text>
                <Text style={detailText}>{booking.guests}</Text>
              </Column>
              <Column style={column}>
                <Text style={detailTitle}>Units</Text>
                <Text style={detailText}>{booking.inventoryIds.length}</Text>
              </Column>
            </Row>
          </Section>
  
          <Text style={paragraph}>
            You can view your booking details and status at any time from your account.
          </Text>
  
          <Text style={paragraph}>
            Thank you for choosing 45 Booking.
            <br />
            The 45 Booking Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
  
  export default BookingRequestEmail;
  
  const main = {
    backgroundColor: '#f4f7fa',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  };
  
  const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '580px',
  };
  
  const heading = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginTop: '48px',
  };
  
  const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#484848',
  };
  
  const detailsSection = {
      border: '1px solid #dddddd',
      borderRadius: '5px',
      padding: '20px',
      margin: '20px 0',
  }
  
  const sectionTitle = {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#d34c23'
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
  