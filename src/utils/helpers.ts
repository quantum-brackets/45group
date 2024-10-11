import crypto from "node:crypto";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_CURRENCY_CODE } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToLocale({
  amount,
  currency_code = DEFAULT_CURRENCY_CODE,
  locale = "en-NG",
}: {
  amount: number;
  currency_code?: string;
  locale?: string;
}) {
  const formattingLocale = currency_code.toLowerCase() === "usd" ? "en-US" : locale;
  return new Intl.NumberFormat(formattingLocale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
