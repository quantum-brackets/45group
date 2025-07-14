/**
 * @fileoverview This file defines the server-side Supabase clients.
 * These functions use "next/headers" and are for server-side use only.
 * They should only be imported in Server Components, Server Actions, and Route Handlers.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const cookieMethods = {
  async getAll() {
    return (await cookies()).getAll();
  },
  async setAll(
    cs: {
      name: string;
      value: string;
      options: CookieOptions;
    }[]
  ) {
    const cookieStore = await cookies();
    cs.forEach((v) => cookieStore.set(v));
  },
};

export function createSupabaseServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieMethods,
    }
  );
}

export function createSupabaseAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations."
    );
  }

  // This client has admin privileges and bypasses RLS policies.
  // It should only be used in server-side code for trusted operations.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: cookieMethods,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
