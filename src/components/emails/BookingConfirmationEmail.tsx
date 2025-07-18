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
    Column
  } from '@react-email/components';
  import * as React from 'react';
  import type { Booking, Listing, User } from '@/lib/types';
import { formatDateToStr, toZonedTimeSafe } from '@/lib/utils';
  
  interface BookingConfirmationEmailProps {
    user: User;
    booking: Booking;
    listing: Listing;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://45group.org';
  
  export const BookingConfirmationEmail = ({ user, booking, listing }: BookingConfirmationEmailProps) => (
    <Html>
      <Head />
      <Preview>Your Booking at {listing.name} is Confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/icon.svg`}
            width="48"
            height="48"
            alt="45 Booking Logo"
          />
          <Heading style={heading}>Your Booking is Confirmed!</Heading>
          <Text style={paragraph}>Hi {user.name},</Text>
          <Text style={paragraph}>
            Great news! Your booking at **{listing.name}** has been confirmed. We are excited to host you.
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
            Please remember to settle any outstanding balance. Payment can be made in person upon check-in.
          </Text>

           <Section style={buttonContainer}>
            <Button style={button} href={`${baseUrl}/booking/${booking.id}`}>
              View Your Booking
            </Button>
          </Section>
  
          <Text style={paragraph}>
            We look forward to welcoming you.
            <br />
            The 45 Booking Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
  
  export default BookingConfirmationEmail;
  
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
    color: '#2aa147',
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
  