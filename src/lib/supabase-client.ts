/**
 * @fileoverview This file defines the client-side Supabase client.
 * This client is safe to use in browser environments and "use client" components.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
