"use server";

import { cookies, headers } from "next/headers";
import { COOKIE_MAX_AGE } from "~/utils/constants";

type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
};

export async function setCookie(
  key: string,
  value: string,
  options: CookieOptions = {}
): Promise<void> {
  cookies().set(key, value, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    ...options,
  });
}

export async function getCookie(key: string): Promise<string | undefined> {
  return cookies().get(key)?.value;
}

export async function deleteCookie(key: string): Promise<void> {
  cookies().delete(key);
}

export async function getAllCookies(): Promise<{ [key: string]: string }> {
  const cookieStore = cookies();
  return Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value]));
}

export async function getHeader(key: string): Promise<string | null> {
  return headers().get(key);
}

export async function getAllHeaders(): Promise<{ [key: string]: string }> {
  const headersList = headers();
  const headersObject: { [key: string]: string } = {};
  headersList.forEach((value, key) => {
    headersObject[key] = value;
  });
  return headersObject;
}
