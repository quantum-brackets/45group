import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";
import { eachDayOfInterval, format } from "date-fns";
import { Booking, Listing, User } from "./types";

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

const subDays = (from: string, to: string) =>
  eachDayOfInterval({
    start: parseDate(from),
    end: parseDate(to),
  });

function formatDateToStr(
  date: string | Date,
  formatStr: string = "yyyy-MM-dd"
): string {
  if (typeof date === 'string') {
    return format(parseDate(date), formatStr);
  }
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


/**
 * Shared logic to determine if two user names are similar.
 * Returns true if they share at least two common name parts.
 * @param name1 - The first name string.
 * @param name2 - The second name string.
 * @returns A boolean indicating if the names are similar.
 */
function areNamesSimilar(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  const tokens1 = name1.toLowerCase().split(/\s+/).filter(Boolean);
  const tokens2 = name2.toLowerCase().split(/\s+/).filter(Boolean);

  const commonTokens = tokens1.filter(token => tokens2.includes(token));

  return commonTokens.length >= 2;
}

/**
 * Finds groups of duplicate users based on name similarity.
 * @param users - An array of all users to check.
 * @returns A record where keys are group identifiers and values are arrays of similar users.
 */
export const findDuplicateUsers = (users: User[]): {
  [key: string]: User[];
} => {
  if (users.length < 2) return {};

  const adj: Record<string, string[]> = {};
  users.forEach(u => adj[u.id] = []);

  // Build an adjacency list based on name similarity
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (areNamesSimilar(users[i].name, users[j].name)) {
        adj[users[i].id].push(users[j].id);
        adj[users[j].id].push(users[i].id);
      }
    }
  }

  // Use graph traversal (DFS) to find connected components (clusters of duplicates)
  const clusters: User[][] = [];
  const visited = new Set<string>();

  users.forEach(user => {
    if (!visited.has(user.id)) {
      const currentCluster: User[] = [];
      const stack = [user.id];
      visited.add(user.id);

      while (stack.length > 0) {
        const uId = stack.pop()!;
        const fullUser = users.find(u => u.id === uId);
        if (fullUser) {
          currentCluster.push(fullUser);
        }

        (adj[uId] || []).forEach(vId => {
          if (!visited.has(vId)) {
            visited.add(vId);
            stack.push(vId);
          }
        });
      }

      if (currentCluster.length > 1) {
        clusters.push(currentCluster);
      }
    }
  });

  // Format clusters into the required output structure
  const duplicateGroups: { [key: string]: User[] } = {};
  clusters.forEach(cluster => {
    cluster.sort((a, b) => a.name.localeCompare(b.name));
    const groupKey = cluster.map(u => u.id).sort().join(',');
    duplicateGroups[groupKey] = cluster;
  });

  return duplicateGroups;
};


export {
  cn,
  calculateBookingFinancials,
  differenceInDays,
  formatCurrency,
  formatDateToStr,
  generateRandomString,
  parseDate,
  subDays,
  areNamesSimilar,
};