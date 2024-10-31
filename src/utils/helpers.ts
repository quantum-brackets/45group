import crypto from "crypto";
import { NextResponse } from "next/server";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jwt from "jsonwebtoken";
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

export function appError({
  status,
  error,
  errors,
  ...rest
}: {
  status: number;
  errors?: {
    field: string | undefined;
    message: string;
  }[];
  error?: string;
} & Omit<ResponseInit, "status">) {
  return NextResponse.json(
    {
      error,
      errors,
    },
    {
      status,
      ...rest,
    }
  );
}

export const signJwt = {
  access: (id: string) =>
    jwt.sign({ user_id: id }, process.env.JWT_SECRET as string, {
      expiresIn: "15m",
    }),
  refresh: (id: string) =>
    jwt.sign({ user_id: id }, process.env.JWT_SECRET as string, {
      expiresIn: "14d",
    }),
};

export const authHeader = (tokenValue: string) => {
  if (!tokenValue) throw new Error("No authorisation token provided");
  return `Bearer ${tokenValue}`;
};
