
'use server'

import { z } from 'zod';
import { getDb } from './db';
import { createSession } from './session';
import type { User } from './types';
import { hashPassword, verifyPassword } from './password';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Authenticates a user based on email and password. This is the centralized
 * function for credential validation.
 * @param email The user's email.
 * @param password The user's password.
 * @returns An object with either the user object on success or an error message.
 */
export async function authenticateUser(email, password) {
    try {
        const db = await getDb();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

        if (!user || !user.password) {
            return { error: 'Incorrect email or password.' };
        }

        if (user.status === 'disabled') {
            return { error: 'Your account has been disabled. Please contact your IT support.' };
        }
            
        const passwordsMatch = await verifyPassword(password, user.password);

        if (!passwordsMatch) {
            return { error: 'Incorrect email or password.' };
        }

        return { user };
    } catch (error) {
        console.error(`[AUTH_ERROR]`, error);
        return { error: 'An unexpected server error occurred during authentication.' };
    }
}


const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function loginAction(formData: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Invalid fields provided.' };
  }

  const { email, password } = validatedFields.data;

  const authResult = await authenticateUser(email, password);

  if (authResult.error) {
      return { error: authResult.error };
  }
  
  const { user } = authResult;
  const sessionId = await createSession(user.id);
  
  if (!sessionId) {
      return { error: 'Server error: Could not create a session. Please try again.' };
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  cookies().set('session', sessionId, {
    expires,
    httpOnly: true,
    path: '/',
    secure: true,
    sameSite: 'none',
  });
  
  const redirectTo = user.role === 'admin' ? '/dashboard' : '/bookings';
  return { success: true, redirectTo };
}

const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function signup(formData: z.infer<typeof SignupSchema>) {
    const validatedFields = SignupSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Invalid fields provided." };
    }

    const { name, email, password } = validatedFields.data;
    const userId = `user-${Math.random().toString(36).substring(2, 11)}`;

    try {
      const db = await getDb();
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
          return { error: 'A user with this email already exists.' };
      }

      const hashedPassword = await hashPassword(password);

      const stmt = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
      stmt.run(userId, name, email, hashedPassword, 'guest');
      
      const sessionId = await createSession(userId);

      if (!sessionId) {
          return { error: 'Account created, but failed to log you in. Please try logging in manually.' };
      }

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      cookies().set('session', sessionId, {
          expires,
          httpOnly: true,
          path: '/',
          secure: true,
          sameSite: 'none',
      });

      return { success: true, redirectTo: '/bookings' };
    } catch(error) {
        console.error(`[SIGNUP_ERROR]`, error);
        return { error: 'An unexpected server error occurred during signup.' };
    }
}
