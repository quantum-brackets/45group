
'use server'

import { z } from 'zod';
import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase';
import { verifyPassword, hashPassword } from './password';
import { createSession } from './session';
import { randomUUID } from 'crypto';

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

  const { data: user, error } = await supabase
    .from('users')
    .select('id, password, status, role')
    .eq('email', email)
    .single();
    
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
    const supabase = createSupabaseAdminClient();
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
        const newUserId = randomUUID();
        const { error: insertError } = await supabase.from('users').insert({
            id: newUserId,
            name,
            email,
            password: hashedPassword,
            status: 'active',
            role: 'guest',
        });

        if (insertError) {
            console.error('[SIGNUP_ERROR]', insertError);
            return { error: "Database error saving new user" };
        }
        userId = newUserId;
    }

    await createSession(userId);

    return { success: true, redirectTo: '/bookings' };
}
