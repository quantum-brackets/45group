
'use server'

import { z } from 'zod';
import { createSupabaseServerClient } from './supabase';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function loginAction(formData: z.infer<typeof LoginSchema>) {
  const supabase = createSupabaseServerClient();
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Invalid fields provided.' };
  }

  const { email, password } = validatedFields.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
      return { error: error.message };
  }

  const { data: { user } } = await supabase.from('users').select('role').eq('email', email).single();
  
  const redirectTo = user?.role === 'admin' ? '/dashboard' : '/bookings';
  return { success: true, redirectTo };
}

const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function signup(formData: z.infer<typeof SignupSchema>) {
    const supabase = createSupabaseServerClient();
    const validatedFields = SignupSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Invalid fields provided." };
    }

    const { name, email, password } = validatedFields.data;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: name,
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true, redirectTo: '/bookings' };
}
