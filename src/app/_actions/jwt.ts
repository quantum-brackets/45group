"use server";

import { cookies } from "next/headers";
import { COOKIE_MAX_AGE } from "~/utils/constants";

export async function setValueToCookie(key: string, value: string) {
  cookies().set(key, value, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getValueFromCookie(key: string) {
  const value = cookies().get(key)?.value;

  return value;
}

export async function deleteValueFromCookie(key: string) {
  return cookies().delete(key);
}
