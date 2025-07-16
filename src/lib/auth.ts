/**
 * @fileoverview This file contains the server actions for user authentication,
 * including login and signup. These actions handle data validation,
 * password hashing/verification, and session management.
 */
'use server'

import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { verifyPassword, hashPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { randomUUID } from 'crypto';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email';

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
    return { error: 'Validation Error: Please enter a valid email and password.' };
  }

  const { password } = validatedFields.data;
  const email = validatedFields.data.email.toLowerCase();

  // Fetch the user from the database.
  const { data: user, error } = await supabase
    .from('users')
    .select('id, status, role, data')
    .eq('email', email)
    .single();
    
  if (error || !user || !user.data) {
    // Generic error message to prevent email enumeration attacks.
    return { error: "Login Failed: Incorrect email or password." };
  }

  const userData = user.data as { password?: string, name?: string };
  // Check if the user has a password. If not, they might be a provisional user.
  if (!userData.password) {
    return { error: "Login Failed: This account is not fully set up. Please try signing up." };
  }

  // Verify the supplied password against the stored hash.
  const isPasswordValid = await verifyPassword(userData.password, password);
  if (!isPasswordValid) {
    return { error: "Login Failed: Incorrect email or password." };
  }
  
  // Check if the user account has been disabled by an admin.
  if (user.status === 'disabled') {
    return { error: "Login Failed: Your account has been disabled. Please contact support." };
  }
  
  // If the user's status is provisional, but they have a password, it means they've completed signup.
  // We should activate their account now.
  if (user.status === 'provisional') {
    const { error: activateError } = await supabase.from('users').update({ status: 'active' }).eq('id', user.id);
    if (activateError) {
      console.error('[LOGIN_ACTION] Failed to activate provisional user:', activateError);
      // Don't block login, but log the error.
    }
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
        return { error: "Validation Error: Please check the form for invalid data." };
    }

    const { name, password } = validatedFields.data;
    const email = validatedFields.data.email.toLowerCase();

    // Check if a user with this email already exists.
    const { data: existingUser } = await supabase.from('users').select('id, status, data').eq('email', email).single();
    
    const hashedPassword = await hashPassword(password);
    let userId: string;
    let isNewUser = false;

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
                 return { error: "Signup Failed: Could not update your provisional account. Please try again." };
            }
            userId = updatedUser.id;
        } else {
            // If the user is already active, return an error.
            return { error: "Signup Failed: A user with this email already exists." };
        }
    } else {
        isNewUser = true;
        // If no user exists, create a new one.
        const { data: newUser, error: insertError } = await supabase.from('users').insert({
            email,
            status: 'active',
            role: 'guest', // All new signups default to the 'guest' role.
            data: { name, password: hashedPassword }
        }).select('id').single();

        if (insertError || !newUser) {
            console.error('[SIGNUP_ERROR]', insertError);
            return { error: "Database Error: Could not save the new user." };
        }
        userId = newUser.id;
    }

    if (isNewUser) {
      // Send a welcome email to brand new users.
      await sendWelcomeEmail({ name, email });
    }

    // Create a session for the newly signed-up user.
    await createSession(userId);

    // Redirect to the main bookings page after signup.
    return { success: true, redirectTo: '/bookings' };
}


const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

/**
 * Handles the first step of the password reset flow.
 * Generates a token, saves it to the user record, and sends the reset email.
 * @param formData - The user's email address.
 * @returns A success or error message.
 */
export async function requestPasswordResetAction(formData: z.infer<typeof PasswordResetRequestSchema>) {
  const supabase = createSupabaseAdminClient();
  const validatedFields = PasswordResetRequestSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Validation Error: Please provide a valid email address.' };
  }
  const email = validatedFields.data.email.toLowerCase();
  
  const { data: user, error } = await supabase.from('users').select('id, data').eq('email', email).single();
  
  // To prevent email enumeration, we always return a success message.
  // The email is only sent if the user actually exists.
  if (!error && user) {
    const token = randomUUID();
    const expires = Date.now() + 3600000; // Token is valid for 1 hour.

    const { error: updateError } = await supabase.from('users').update({
        data: {
            ...user.data,
            password_reset_token: token,
            password_reset_expires: expires,
        }
    }).eq('id', user.id);

    if (!updateError) {
        await sendPasswordResetEmail({ name: user.data.name, email }, token);
    } else {
        console.error("Failed to save password reset token:", updateError);
    }
  }
  
  return { success: "If an account with that email exists, we've sent a password reset link." };
}

const ResetPasswordSchema = z.object({
  token: z.string().uuid("Invalid token format."),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

/**
 * Handles the final step of the password reset flow.
 * Verifies the token and updates the user's password.
 * @param formData - The reset token and new password.
 * @returns A success or error message.
 */
export async function resetPasswordAction(formData: z.infer<typeof ResetPasswordSchema>) {
  const supabase = createSupabaseAdminClient();
  const validatedFields = ResetPasswordSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Validation Error: Please check the form for invalid data.' };
  }

  const { token, password } = validatedFields.data;

  // Find user by the reset token.
  const { data: user, error: fetchError } = await supabase.from('users')
    .select('id, data')
    .eq('data->>password_reset_token', token)
    .single();

  if (fetchError || !user) {
    return { error: "Reset Failed: This password reset token is invalid." };
  }
  
  const expires = user.data.password_reset_expires as number;
  if (!expires || Date.now() > expires) {
    return { error: "Reset Failed: This password reset token has expired." };
  }

  const hashedPassword = await hashPassword(password);
  
  // Clear the reset token fields after a successful reset.
  const { password_reset_token, password_reset_expires, ...restOfData } = user.data;

  const { error: updateError } = await supabase.from('users').update({
      data: {
        ...restOfData,
        password: hashedPassword,
      }
  }).eq('id', user.id);

  if (updateError) {
    return { error: "Database Error: Failed to update your password. Please try again." };
  }
  
  return { success: "Your password has been successfully reset." };
}
