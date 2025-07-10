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
import type { Booking, Listing, User } from './types';
import { BookingRequestEmail } from '@/components/emails/BookingRequestEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL;

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

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/reset-password?token=${token}`;

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
