
'use server'

import 'server-only';
import type { User } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from './supabase';
import { cookies } from 'next/headers';


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
    return null;
  }
  
  // Check if session has expired
  const sessionExpires = new Date(session.expires_at).getTime();
  if (sessionExpires < Date.now()) {
    // Optionally, delete the expired session from DB
    await supabase.from('sessions').delete().eq('id', token);
    return null;
  }
  
  return session.user as User;
}
