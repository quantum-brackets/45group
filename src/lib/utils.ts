import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";
import { format } from "date-fns";
import { Booking, Listing } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a random lowercase alphanumeric string of a given length.
 *
 * @param length The length of the string to generate.
 * @returns A random lowercase alphanumeric string.
 */
function generateRandomString(length: number): string {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = crypto.randomBytes(length);
  const result = Array.from(randomBytes)
    .map((byte) => characters[byte % characters.length])
    .join("");
  return result;
}

function formatDateToStr(
  date: string | Date,
  formatStr: string = "yyyy-MM-dd"
): string {
  return format(date, formatStr);
}

function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Note: month is 0-indexed in JS Date
  return new Date(year, month - 1, day);
}

function differenceInDays(dateStr1: string, dateStr2: string) {
  const date1 = parseDate(dateStr1);
  const date2 = parseDate(dateStr2);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const calculateBookingFinancials = (
  booking: Booking,
  listing: Listing | null
) => {
  const units = (booking.inventoryIds || []).length;
  const guests = booking.guests;
  const durationDays = differenceInDays(booking.endDate, booking.startDate) + 1;
  const nights = durationDays > 1 ? durationDays - 1 : 1;
  let baseBookingCost = 0;

  // For global reports, we don't have a single listing context, so we have to make some assumptions
  // or handle this differently if currencies can vary. Assuming a default for now.
  const price = listing?.price || 0;
  const price_unit = listing?.price_unit || "night";

  switch (price_unit) {
    case "night":
      baseBookingCost = price * nights * units;
      break;
    case "hour":
      baseBookingCost = price * durationDays * 10 * units;
      break;
    case "person":
      baseBookingCost = price * guests * units;
      break;
  }
  const discountAmount = (baseBookingCost * (booking.discount || 0)) / 100;
  const addedBillsTotal = (booking.bills || []).reduce(
    (sum, bill) => sum + bill.amount,
    0
  );
  const totalBill = baseBookingCost + addedBillsTotal;
  const totalPayments =
    (booking.payments || []).reduce((sum, payment) => sum + payment.amount, 0) +
    discountAmount;
  const balance = totalBill - totalPayments;

  return { totalBill, totalPayments, balance, stayDuration: durationDays };
};

export {
  cn,
  calculateBookingFinancials,
  generateRandomString,
  formatCurrency,
  formatDateToStr,
  parseDate,
  differenceInDays,
};
