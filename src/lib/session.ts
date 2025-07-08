
'use server'

import 'server-only';
import type { User } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from './supabase';
import { cookies } from 'next/headers';
import { add } from 'date-fns';


export async function getSession(): Promise<User | null> {
  noStore();
  const cookieStore = cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  
  const supabase = createSupabaseServerClient();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
        *,
        user:users(id, name, email, role, status, notes, phone)
    `)
    .eq('id', token)
    .single();

  if (sessionError || !session || !session.user) {
    // If the session is invalid, clear the cookie
    cookieStore.set('session_token', '', { expires: new Date(0), path: '/' });
    return null;
  }
  
  // Check if session has expired
  const sessionExpires = new Date(session.expires_at).getTime();
  if (sessionExpires < Date.now()) {
    // Optionally, delete the expired session from DB
    await supabase.from('sessions').delete().eq('id', token);
    cookieStore.set('session_token', '', { expires: new Date(0), path: '/' });
    return null;
  }
  
  return session.user as User;
}

export async function createSession(userId: string) {
    const supabase = createSupabaseServerClient();
    const cookieStore = cookies();
    
    const expiresAt = add(new Date(), {
        hours: 24,
    });

    const { data, error } = await supabase.from('sessions').insert({
        user_id: userId,
        expires_at: expiresAt.toISOString(),
    }).select().single();

    if (error || !data) {
        console.error('Failed to create session:', error);
        return null;
    }

    cookieStore.set('session_token', data.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
    return data.id;
}


export async function logout() {
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;

    if (token) {
        const supabase = createSupabaseServerClient();
        await supabase.from('sessions').delete().eq('id', token);
    }
    
    cookieStore.set('session_token', '', { expires: new Date(0), path: '/' });
}
