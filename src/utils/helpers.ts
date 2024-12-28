import crypto from "crypto";
import { NextResponse } from "next/server";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Yup from "yup";
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

export function compareObjectValues(
  initialValues: Record<string, any>,
  newValues: Record<string, any>
) {
  return Object.keys(initialValues).reduce(
    (acc, key) => {
      if (key in newValues && initialValues[key] !== newValues[key]) {
        acc[key] = newValues[key];
      }
      return acc;
    },
    {} as Record<string, any>
  );
}

function formDataToObject(formData: FormData): { [key: string]: any } {
  const obj: { [key: string]: any } = {};

  formData.forEach((value, key) => {
    const normalizedKey = key.endsWith("[]") ? key.slice(0, -2) : key;

    if (normalizedKey in obj) {
      if (Array.isArray(obj[normalizedKey])) {
        obj[normalizedKey].push(value);
      } else {
        obj[normalizedKey] = [obj[normalizedKey], value];
      }
    } else {
      obj[normalizedKey] = value;
    }
  });

  return obj;
}

export function validateSchema({
  object,
  data,
  isFormData = false,
}: {
  object: Yup.AnyObject;
  data: any;
  isFormData?: boolean;
}) {
  const schema = Yup.object(object);

  return schema.validate(
    { ...(isFormData ? formDataToObject(data) : data) },
    { abortEarly: false, stripUnknown: true }
  ) as any;
}

export function filterPrivateValues<T>(values: T): T {
  if (!values || typeof values !== "object") {
    return values;
  }

  if (values instanceof File) return values;

  if (Array.isArray(values)) {
    return values.map((item) => filterPrivateValues(item)) as any;
  }

  return Object.fromEntries(
    Object.entries(values as any)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, value]) => [key, filterPrivateValues(value)])
  ) as T;
}

export function formatFileSize(size: number): string {
  const i: number = Math.floor(Math.log(size) / Math.log(1024));

  return Number((size / Math.pow(1024, i)).toFixed(2)) * 1 + " " + ["B", "KB", "MB", "GB", "TB"][i];
}

export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
