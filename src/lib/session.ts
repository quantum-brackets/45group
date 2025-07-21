/**
 * @fileoverview This file contains server-side functions for managing user sessions.
 * It uses HTTP-only cookies to securely store a session token, which is then
 * used to retrieve user data from the database.
 */
'use server'

import 'server-only';
import type { User } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { add } from 'date-fns';


/**
 * Retrieves the current user's session from the session cookie.
 * @returns The authenticated User object, or null if the session is invalid or non-existent.
 */
export async function getSession(): Promise<User | null> {
  // `unstable_noStore` is used to prevent Next.js from caching the session data.
  // This ensures that session information is always fresh for each request.
  noStore();
  const token = (await cookies()).get('session')?.value;

  if (!token) {
    // No session cookie found.
    return null;
  }
  
  const supabase = createSupabaseAdminClient();

  // Fetch the session and the associated user data in a single query.
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
        *,
        user:users(id, email, role, status, data)
    `)
    .eq('id', token)
    .single();

  if (sessionError || !session || !session.user) {
    // If the session is invalid (e.g., token doesn't exist in DB), return null.
    // The cookie will be overwritten on the next successful login.
    return null;
  }
  
  // Check if the session has expired.
  const sessionExpires = new Date(session.expires_at).getTime();
  if (sessionExpires < Date.now()) {
    // If expired, delete the session from the database for cleanup.
    await supabase.from('sessions').delete().eq('id', token);
    return null;
  }
  
  // Unpack the user's data from the JSONB column and return the complete User object.
  const { data: userData, ...restOfUser } = session.user;
  return { ...restOfUser, ...userData } as User;
}

/**
 * Creates a new session for a user and sets the session cookie.
 * @param userId - The ID of the user to create a session for.
 * @returns The session ID, or null if creation fails.
 */
export async function createSession(userId: string) {
    const supabase = createSupabaseAdminClient();
    
    // Set the session to expire in 24 hours.
    const expiresAt = add(new Date(), {
        hours: 24,
    });

    // Insert the new session record into the database.
    const { data, error } = await supabase.from('sessions').insert({
        user_id: userId,
        expires_at: expiresAt.toISOString(),
    }).select().single();

    if (error || !data) {
        console.error('Failed to create session:', error);
        return null;
    }

    // Set the session token in a secure, HTTP-only cookie.
    (await cookies()).set('session', data.id, {
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie.
        secure: true,   // Ensures the cookie is only sent over HTTPS.
        expires: expiresAt,
        sameSite: 'none', // Required for cross-site requests (e.g., in an iframe).
        path: '/',      // Makes the cookie available to the entire site.
    });

    return data.id;
}

/**
 * Logs the user out by deleting their session from the database and removing the session cookie.
 */
export async function logout() {
    const token = (await cookies()).get('session')?.value;

    if (token) {
        // Delete the session record from the database.
        const supabase = createSupabaseAdminClient();
        await supabase.from('sessions').delete().eq('id', token);
    }

    // Remove the session cookie from the browser.
    (await cookies()).delete('session');
}
