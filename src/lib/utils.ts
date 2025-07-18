import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"
import { utcToZonedTime, format as formatTz } from 'date-fns-tz';
import { TIMEZONE } from "./constants";


/**
 * Converts a date from UTC to the application's standard timezone.
 * This is useful for displaying dates in a consistent way across the app.
 * @param date - The date to convert, can be a Date object, string, or number.
 * @returns A new Date object in the specified timezone.
 */
function utcToZonedTimeSafe(date: Date | string | number): Date {
    return utcToZonedTime(date, TIMEZONE);
}

/**
 * Formats a date string in a specific timezone, ensuring consistent output.
 * @param date - The date to format, can be a Date object, string, or number.
 * @param formatStr - The format string (e.g., 'PPP', 'LLL dd, y').
 * @returns A formatted date string.
 */
function formatInTimeZone(date: Date | string | number, formatStr: string): string {
    const zonedDate = utcToZonedTime(date, TIMEZONE);
    return formatTz(zonedDate, formatStr, { timeZone: TIMEZONE });
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random lowercase alphanumeric string of a given length.
 *
 * @param length The length of the string to generate.
 * @returns A random lowercase alphanumeric string.
 */
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(length);
  const result = Array.from(randomBytes).map(byte => characters[byte % characters.length]).join('');
  return result;
}


export {
    cn,
    generateRandomString,
    utcToZonedTimeSafe,
    formatInTimeZone
}
