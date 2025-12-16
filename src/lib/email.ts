/**
 * @fileoverview This file centralizes all email sending logic for the application.
 * It uses the Resend API to send transactional emails. The email content is
 * rendered using React components for easy and type-safe templating.
 */
'use server';

import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { PasswordResetEmail } from '@/components/emails/PasswordResetEmail';
import { BookingConfirmationEmail } from '@/components/emails/BookingConfirmationEmail';
import type { Booking, Listing, User } from '@/lib/types';
import { BookingRequestEmail } from '@/components/emails/BookingRequestEmail';
import { BookingSummaryEmail } from '@/components/emails/BookingSummaryEmail';
import { ReportEmail, type ReportEmailProps } from '@/components/emails/ReportEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL;

// TODO: The .env file must be populated for emails to be sent.
// This check helps prevent runtime errors but can lead to silent failures.
// Consider throwing an error in a development environment if these are not set.
if (!process.env.RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY is not set. Email functionality will be disabled.");
}
if (!fromEmail) {
    console.warn("WARNING: RESEND_FROM_EMAIL is not set. Email functionality will be disabled.");
}

// A helper function to ensure we don't try to send emails if Resend isn't configured.
const canSendEmail = () => {
    return process.env.RESEND_API_KEY && fromEmail;
}

/**
 * Sends a welcome email to a newly registered user.
 * @param user - The user object containing their name and email.
 */
export async function sendWelcomeEmail(user: { name: string, email: string }) {
    if (!canSendEmail()) return;

    try {
        await resend.emails.send({
            from: fromEmail!,
            to: user.email,
            subject: 'Welcome to 45 Booking!',
            react: WelcomeEmail({ name: user.name }),
        });
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}

/**
 * Sends a password reset email to a user.
 * @param user - The user object.
 * @param token - The unique, secure token for resetting the password.
 */
export async function sendPasswordResetEmail(user: { name: string, email: string }, token: string) {
    if (!canSendEmail()) return;

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://45group.org'}/reset-password?token=${token}`;

    try {
        await resend.emails.send({
            from: fromEmail!,
            to: user.email,
            subject: 'Reset Your 45 Booking Password',
            react: PasswordResetEmail({ name: user.name, resetLink }),
        });
    } catch (error) {
        console.error("Failed to send password reset email:", error);
    }
}


/**
 * Sends an email to a user notifying them that a booking request has been received.
 * @param user - The user who made the booking.
 * @param booking - The booking details.
 * @param listing - The listing details.
 */
export async function sendBookingRequestEmail(user: User, booking: Booking, listing: Listing) {
    if (!canSendEmail()) return;

    try {
        await resend.emails.send({
            from: fromEmail!,
            to: user.email,
            subject: `Booking Request Received for ${listing.name}`,
            react: BookingRequestEmail({ user, booking, listing }),
        });
    } catch (error) {
        console.error("Failed to send booking request email:", error);
    }
}


/**
 * Sends an email to a user notifying them that their booking has been confirmed.
 * @param user - The user who owns the booking.
 * @param booking - The booking details.
 * @param listing - The listing details.
 */
export async function sendBookingConfirmationEmail(user: User, booking: Booking, listing: Listing) {
    if (!canSendEmail()) return;

    try {
        await resend.emails.send({
            from: fromEmail!,
            to: user.email,
            subject: `Booking Confirmed: Your Reservation at ${listing.name}`,
            react: BookingConfirmationEmail({ user, booking, listing }),
        });
    } catch (error) {
        console.error("Failed to send booking confirmation email:", error);
    }
}

/**
 * Sends a summary email to a user after their booking is completed.
 * @param user - The user who owns the booking.
 * @param booking - The booking details.
 * @param listing - The listing details.
 */
export async function sendBookingSummaryEmail(user: User, booking: Booking, listing: Listing) {
    if (!canSendEmail()) return;
    if (!user.email || user.email.includes('@45group.org')) return; // Don't send to provisional or placeholder emails.
    
    try {
        await resend.emails.send({
            from: fromEmail!,
            to: user.email,
            subject: `Your Stay at ${listing.name}: Booking Summary`,
            react: BookingSummaryEmail({ user, booking, listing }),
        });
    } catch (error) {
        console.error("Failed to send booking summary email:", error);
    }
}


interface SendReportEmailProps {
    email: string;
    listing: Listing | null;
    dateRange: { from: string; to: string };
    guestOccupancyCsv: string;
    salesReportCsv: string;
    recordOfPaymentsCsv: string;
}
  
/**
 * Sends a report email containing booking data.
 * @param props - The properties for the report email.
 */
export async function sendReportEmail({ email, guestOccupancyCsv, salesReportCsv, recordOfPaymentsCsv, ...props }: SendReportEmailProps) {
    if (!canSendEmail()) return;
  
    try {
      await resend.emails.send({
        from: fromEmail!,
        to: email,
        subject: `Booking Report for ${props.listing?.name || 'All Venues'}`,
        react: ReportEmail(props),
        attachments: [
            {
                filename: 'guest_occupancy.csv',
                content: Buffer.from(guestOccupancyCsv, 'utf-8'),
            },
            {
                filename: 'sales_report.csv',
                content: Buffer.from(salesReportCsv, 'utf-8'),
            },
            {
                filename: 'record_of_payments.csv',
                content: Buffer.from(recordOfPaymentsCsv, 'utf-8'),
            }
        ]
      });
    } catch (error) {
      console.error('Failed to send report email:', error);
      // Re-throw the error to be handled by the server action
      throw error;
    }
}
