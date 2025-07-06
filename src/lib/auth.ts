
'use server'

import { z } from 'zod';
import { getDb } from './db';
import { createSession } from './session';
import type { User } from './types';
import { hashPassword, verifyPassword } from './password';
import { cookies } from 'next/headers';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function login(formData: z.infer<typeof LoginSchema>, from: string | null) {
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { success: false, error: 'Invalid fields provided.' };
  }

  const { email, password } = validatedFields.data;

  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user || !user.password) {
      return { success: false, error: 'Incorrect email or password.' };
    }
          
    const passwordsMatch = await verifyPassword(password, user.password);

    if (!passwordsMatch) {
      return { success: false, error: 'Incorrect email or password.' };
    }

    // Credentials are valid, now create the session.
    const sessionId = await createSession(user.id);
    
    // Explicitly check if session creation was successful
    if (!sessionId) {
        return { success: false, error: 'Server error: Could not create a session. Please try again.' };
    }

    // Session created, now set cookie.
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    cookies().set('session', sessionId, {
      expires,
      httpOnly: true,
      path: '/',
    });
    
    const redirectTo = from || (user.role === 'admin' ? '/dashboard' : '/bookings');
    return { success: true, redirectTo };
    
  } catch (error) {
    console.error('[LOGIN_ERROR]', error);
    return { success: false, error: 'An unexpected server error occurred.' };
  }
}

const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function signup(formData: z.infer<typeof SignupSchema>) {
    const validatedFields = SignupSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid fields provided." };
    }

    const { name, email, password } = validatedFields.data;
    const userId = `user-${Math.random().toString(36).substring(2, 11)}`;

    try {
        const db = await getDb();
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return { success: false, error: 'A user with this email already exists.' };
        }

        const hashedPassword = await hashPassword(password);

        const stmt = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
        stmt.run(userId, name, email, hashedPassword, 'guest');
        
        // User created, now create session.
        const sessionId = await createSession(userId);

        if (!sessionId) {
            return { success: false, error: 'Account created, but failed to log you in. Please try logging in manually.' };
        }

        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        cookies().set('session', sessionId, {
            expires,
            httpOnly: true,
            path: '/',
        });

        return { success: true, redirectTo: '/bookings' };

    } catch (error) {
        console.error(`[SIGNUP_ERROR] ${error}`);
        return { success: false, error: 'An unexpected error occurred during signup.' };
    }
}
