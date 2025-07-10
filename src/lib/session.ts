
'use server'

import 'server-only';
import type { User } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from './supabase';
import { cookies } from 'next/headers';
import { add } from 'date-fns';


export async function getSession(): Promise<User | null> {
  noStore();
  const token = (await cookies()).get('session')?.value;

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
    // If the session is invalid, just return null.
    // The cookie will be overwritten on next login.
    return null;
  }
  
  // Check if session has expired
  const sessionExpires = new Date(session.expires_at).getTime();
  if (sessionExpires < Date.now()) {
    // Delete the expired session from the DB
    await supabase.from('sessions').delete().eq('id', token);
    return null;
  }
  
  return session.user as User;
}

export async function createSession(userId: string) {
    const supabase = createSupabaseServerClient();
    
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

    (await cookies()).set('session', data.id, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: 'none',
        path: '/',
    });

    return data.id;
}


export async function logout() {
    const token = (await cookies()).get('session')?.value;

    if (token) {
        const supabase = createSupabaseServerClient();
        await supabase.from('sessions').delete().eq('id', token);
    }

    (await cookies()).delete('session');
}
