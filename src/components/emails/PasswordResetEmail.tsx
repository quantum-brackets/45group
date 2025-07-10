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
  
  interface PasswordResetEmailProps {
    name: string;
    resetLink: string;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  
  export const PasswordResetEmail = ({ name, resetLink }: PasswordResetEmailProps) => (
    <Html>
      <Head />
      <Preview>Reset Your 45 Booking Password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${baseUrl}/icon.svg`}
            width="48"
            height="48"
            alt="45 Booking Logo"
          />
          <Heading style={heading}>Reset Your Password</Heading>
          <Text style={paragraph}>Hi {name},</Text>
          <Text style={paragraph}>
            We received a request to reset your password. You can reset your password by clicking the link below. This link is valid for 1 hour.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Reset Password
            </Button>
          </Section>
          <Text style={paragraph}>
            If you did not request a password reset, please ignore this email or contact support if you have concerns.
          </Text>
          <Text style={paragraph}>
            Thanks,
            <br />
            The 45 Booking Team
          </Text>
          <Section style={linkSection}>
            <Text style={linkText}>
              If the button above doesn't work, copy and paste this URL into your browser:
            </Text>
            <Link style={link} href={resetLink}>
              {resetLink}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
  
  export default PasswordResetEmail;
  
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

  const linkSection = {
      paddingTop: '20px',
      borderTop: '1px solid #dddddd',
  }

  const linkText = {
      fontSize: '14px',
      color: '#777777',
  }
  
  const link = {
      color: '#d34c23',
      fontSize: '14px',
      wordBreak: 'break-all' as const,
  }
  