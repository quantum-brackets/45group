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
    field: string | string[] | undefined;
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
    const nestedMatch = key.match(/^(.+?)\[(\d+)\]\[(.+?)\]$/);
    const arrayMatch = key.match(/^(.+?)\[(\d+)\]$/);

    if (nestedMatch) {
      const [_, baseKey, index, property] = nestedMatch;
      const idx = parseInt(index);
      if (!(baseKey in obj)) {
        obj[baseKey] = [];
      }
      if (!obj[baseKey][idx]) {
        obj[baseKey][idx] = {};
      }
      obj[baseKey][idx][property] = value;
    } else if (arrayMatch) {
      const [_, baseKey, index] = arrayMatch;
      const idx = parseInt(index);
      if (!(baseKey in obj)) {
        obj[baseKey] = [];
      }
      obj[baseKey][idx] = value;
    } else if (key.endsWith("[]")) {
      const baseKey = key.slice(0, -2);
      if (baseKey in obj) {
        obj[baseKey].push(value);
      } else {
        obj[baseKey] = [value];
      }
    } else {
      if (key in obj) {
        if (Array.isArray(obj[key])) {
          obj[key].push(value);
        } else {
          obj[key] = [obj[key], value];
        }
      } else {
        obj[key] = value;
      }
    }
  });

  return obj;
}
export function validateSchema<T extends any>({
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
  ) as Promise<T>;
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

export function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(/[.]/).reduce((current, key) => {
    return current?.[key];
  }, obj);
}
