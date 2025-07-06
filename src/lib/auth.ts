
'use server'

import { z } from 'zod';
import { getDb } from './db';
import { createSession } from './session';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { User } from './types';
import { hashPassword, verifyPassword } from './password';
import { cookies } from 'next/headers';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

function getErrorRedirect(from: string | null, error: string) {
    const params = new URLSearchParams();
    params.set('error', error);
    if (from) {
        params.set('from', from);
    }
    return `/login?${params.toString()}`;
}


export async function login(formData: z.infer<typeof LoginSchema>, from: string | null) {
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    redirect(getErrorRedirect(from, 'Invalid fields provided.'));
  }

  const { email, password } = validatedFields.data;

  const db = await getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (!user || !user.password) {
    redirect(getErrorRedirect(from, 'Incorrect email or password.'));
  }
        
  const passwordsMatch = await verifyPassword(password, user.password);

  if (!passwordsMatch) {
    redirect(getErrorRedirect(from, 'Incorrect email or password.'));
  }

  // Credentials are valid, now create the session.
  let sessionId: string;
  try {
    sessionId = await createSession(user.id);
  } catch (error) {
    console.error('[LOGIN_SESSION_DB_ERROR]', error);
    redirect(getErrorRedirect(from, 'Database error: Could not create session.'));
  }

  // Session created, now set cookie and redirect.
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  cookies().set('session', sessionId, {
    expires,
    httpOnly: true,
    path: '/',
  });
  
  const redirectTo = from || (user.role === 'admin' ? '/admin' : '/bookings');
  redirect(redirectTo);
}

const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function signup(formData: z.infer<typeof SignupSchema>) {
    const validatedFields = SignupSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Invalid fields.", fieldErrors: validatedFields.error.flatten().fieldErrors };
    }

    const { name, email, password } = validatedFields.data;
    const userId = `user-${randomUUID()}`;

    try {
        const db = await getDb();
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return { error: 'A user with this email already exists.' };
        }

        const hashedPassword = await hashPassword(password);

        const stmt = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
        stmt.run(userId, name, email, hashedPassword, 'guest');
        
    } catch (error) {
        console.error(`[SIGNUP] Error creating user: ${error}`);
        return { error: 'An unexpected error occurred during signup.' };
    }
    
    // User created, now create session.
    let sessionId: string;
    try {
        sessionId = await createSession(userId);
    } catch (error) {
        console.error(`[SIGNUP] Error creating session: ${error}`);
        return { error: 'Account created, but could not log you in. Please log in manually.' };
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    cookies().set('session', sessionId, {
        expires,
        httpOnly: true,
        path: '/',
    });
    
    redirect('/bookings');
}
