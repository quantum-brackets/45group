/**
 * @fileoverview This file contains the server actions for user authentication,
 * including login and signup. These actions handle data validation,
 * password hashing/verification, and session management.
 */
'use server'

import { z } from 'zod';
import { createSupabaseAdminClient } from './supabase';
import { verifyPassword, hashPassword } from './password';
import { createSession } from './session';
import { randomUUID } from 'crypto';

// Zod schema for login form validation.
const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

/**
 * Handles the user login process.
 * @param formData - The user's email and password.
 * @param from - The URL path the user was on before being redirected to login.
 *               This is used to redirect them back after a successful login.
 * @returns A result object indicating success (with a redirectTo path) or an error message.
 */
export async function loginAction(formData: z.infer<typeof LoginSchema>, from: string | null) {
  const supabase = createSupabaseAdminClient();
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Invalid fields provided.' };
  }

  const { email, password } = validatedFields.data;

  // Fetch the user from the database.
  const { data: user, error } = await supabase
    .from('users')
    .select('id, status, role, data')
    .eq('email', email)
    .single();
    
  if (error || !user || !user.data) {
    // Generic error message to prevent email enumeration attacks.
    return { error: "Incorrect email or password." };
  }

  const userData = user.data as { password?: string };
  // Check if the user has a password. If not, they might be a provisional user.
  if (!userData.password) {
    return { error: "Account not fully set up. Please sign up." };
  }

  // Verify the supplied password against the stored hash.
  const isPasswordValid = await verifyPassword(userData.password, password);
  if (!isPasswordValid) {
    return { error: "Incorrect email or password." };
  }
  
  // Check if the user account has been disabled by an admin.
  if (user.status === 'disabled') {
    return { error: "Your account has been disabled. Please contact support." };
  }

  // If all checks pass, create a new session for the user.
  await createSession(user.id);

  // Determine where to redirect the user after login.
  const redirectTo = from || (user.role === 'admin' ? '/dashboard' : '/bookings');
  return { success: true, redirectTo };
}

// Zod schema for signup form validation.
const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

/**
 * Handles the user signup process. This also handles activating "provisional" accounts
 * created during a guest checkout.
 * @param formData - The new user's name, email, and password.
 * @returns A result object indicating success (with a redirectTo path) or an error message.
 */
export async function signup(formData: z.infer<typeof SignupSchema>) {
    const supabase = createSupabaseAdminClient();
    const validatedFields = SignupSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Invalid fields provided." };
    }

    const { name, email, password } = validatedFields.data;

    // Check if a user with this email already exists.
    const { data: existingUser } = await supabase.from('users').select('id, status, data').eq('email', email).single();
    
    const hashedPassword = await hashPassword(password);
    let userId: string;

    if (existingUser) {
        // If the existing user is 'provisional' (from a guest booking),
        // we activate their account by adding their name and password.
        if (existingUser.status === 'provisional') {
            const { data: updatedUser, error: updateError } = await supabase.from('users').update({
                status: 'active',
                data: {
                  ...existingUser.data,
                  name: name,
                  password: hashedPassword,
                }
            }).eq('id', existingUser.id).select('id').single();

            if (updateError || !updatedUser) {
                 return { error: "Could not complete signup. Please try again." };
            }
            userId = updatedUser.id;
        } else {
            // If the user is already active, return an error.
            return { error: "A user with this email already exists." };
        }
    } else {
        // If no user exists, create a new one.
        const newUserId = randomUUID();
        const { error: insertError } = await supabase.from('users').insert({
            id: newUserId,
            email,
            status: 'active',
            role: 'guest', // All new signups default to the 'guest' role.
            data: { name, password: hashedPassword }
        });

        if (insertError) {
            console.error('[SIGNUP_ERROR]', insertError);
            return { error: "Database error saving new user" };
        }
        userId = newUserId;
    }

    // Create a session for the newly signed-up user.
    await createSession(userId);

    // Redirect to the main bookings page after signup.
    return { success: true, redirectTo: '/bookings' };
}
