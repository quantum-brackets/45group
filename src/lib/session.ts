
'use server'

import 'server-only';
import type { User } from './types';
import { unstable_noStore as noStore } from 'next/cache';
import { createSupabaseServerClient } from './supabase';


export async function getSession(): Promise<User | null> {
  noStore();
  const supabase = createSupabaseServerClient();
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, role, status, notes, phone')
    .eq('id', session.user.id)
    .single();

  if (userError || !user) {
    console.error(`[SESSION_GET] User profile not found for authenticated session user ${session.user.id}:`, userError);
    return null;
  }
  
  return user as User;
}
