import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
  } from '@react-email/components';
  import * as React from 'react';
  
  interface WelcomeEmailProps {
    name: string;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  
  export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
    <Html>
      <Head />
      <Preview>Welcome to 45 Booking, Your Premier Hospitality Partner</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/icon.svg`}
            width="48"
            height="48"
            alt="45 Booking Logo"
          />
          <Heading style={heading}>Welcome aboard, {name}!</Heading>
          <Text style={paragraph}>
            We're thrilled to have you as part of the 45 Booking family. You're all set to explore and book premier hotel rooms, event venues, and restaurants.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={`${baseUrl}/search`}>
              Start Exploring
            </Button>
          </Section>
          <Text style={paragraph}>
            If you have any questions or need assistance, our team is always here to help.
          </Text>
          <Text style={paragraph}>
            Best,
            <br />
            The 45 Booking Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
  
  export default WelcomeEmail;
  
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
  