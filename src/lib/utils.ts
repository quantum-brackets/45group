import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random lowercase alphanumeric string of a given length.
 *
 * @param length The length of the string to generate.
 * @returns A random lowercase alphanumeric string.
 */
export function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(length);
  const result = Array.from(randomBytes).map(byte => characters[byte % characters.length]).join('');
  return result;
}
