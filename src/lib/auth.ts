
'use server'

import { z } from 'zod';
import { createSupabaseServerClient } from './supabase';
import { verifyPassword, hashPassword } from './password';
import { cookies } from 'next/headers';
import { add } from 'date-fns';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

async function createSession(userId: string) {
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


export async function loginAction(formData: z.infer<typeof LoginSchema>) {
  const supabase = createSupabaseServerClient();
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Invalid fields provided.' };
  }

  const { email, password } = validatedFields.data;

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user) {
    return { error: "Incorrect email or password." };
  }

  const isPasswordValid = await verifyPassword(user.password, password);
  if (!isPasswordValid) {
    return { error: "Incorrect email or password." };
  }
  
  if (user.status === 'disabled') {
    return { error: "Your account has been disabled. Please contact support." };
  }

  await createSession(user.id);

  const redirectTo = user.role === 'admin' ? '/dashboard' : '/bookings';
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

    const { data: existingUser } = await supabase.from('users').select('id, status').eq('email', email).single();
    
    const hashedPassword = await hashPassword(password);
    let userId: string;

    if (existingUser) {
        // If user exists and is provisional (e.g., from a guest booking), update them to active.
        if (existingUser.status === 'provisional') {
            const { data: updatedUser, error: updateError } = await supabase.from('users').update({
                password: hashedPassword,
                status: 'active',
                name: name,
            }).eq('id', existingUser.id).select('id').single();

            if (updateError || !updatedUser) {
                 return { error: "Could not complete signup. Please try again." };
            }
            userId = updatedUser.id;
        } else {
            return { error: "A user with this email already exists." };
        }
    } else {
        // Create a new user if they don't exist at all
        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            name,
            email,
            password: hashedPassword,
            status: 'active'
        }).select('id').single();

        if (insertError || !newUser) {
            return { error: "Database error saving new user" };
        }
        userId = newUser.id;
    }

    await createSession(userId);

    return { success: true, redirectTo: '/bookings' };
}
