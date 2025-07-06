
'use server'

import { z } from 'zod';
import { getDb } from './db';
import * as scryptJs from 'scrypt-js';
import { createSession } from './session';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { User } from './types';
import { timingSafeEqual } from 'crypto';
import { logToFile } from './logger';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function login(formData: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(formData);
  if (!validatedFields.success) {
    return { error: 'Invalid fields.' };
  }

  const { email, password } = validatedFields.data;

  try {
    const db = await getDb();
    await logToFile(`[LOGIN] Attempting login for email: ${email}`);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user || !user.password) {
      await logToFile(`[LOGIN] User not found or has no password for email: ${email}`);
      return { error: 'No account found with this email.' };
    }
    
    await logToFile(`[LOGIN] User found: ${user.email}. Role: ${user.role}`);
    await logToFile(`[LOGIN] Stored password hash from DB: ${user.password}`);

    const [salt, storedKey] = user.password.split(':');
    if (!salt || !storedKey) {
        await logToFile(`[LOGIN] Invalid password format in DB for user: ${email}`);
        return { error: 'Cannot log you in. Please contact support.'}
    }
    const saltBuffer = Buffer.from(salt, 'hex');
    
    await logToFile(`[LOGIN] Provided password: ${password}`);

    const inputKey = (await scryptJs.scrypt(Buffer.from(password, 'utf-8'), saltBuffer, 16384, 8, 1, 64)) as Buffer;
    const storedKeyBuffer = Buffer.from(storedKey, 'hex');

    await logToFile(`[LOGIN] Generated key from input (hex): ${inputKey.toString('hex')}`);
    await logToFile(`[LOGIN] Stored key from DB (hex): ${storedKeyBuffer.toString('hex')}`);
    
    if (inputKey.length !== storedKeyBuffer.length) {
        await logToFile('[LOGIN] Key length mismatch. This should not happen and indicates a potential hash corruption.');
        return { error: 'Incorrect password.' };
    }

    const passwordsMatch = timingSafeEqual(inputKey, storedKeyBuffer);
    await logToFile(`[LOGIN] Passwords match result (timingSafeEqual): ${passwordsMatch}`);

    if (!passwordsMatch) {
      await logToFile(`[LOGIN] Password mismatch for user: ${email}`);
      return { error: 'Incorrect password.' };
    }
    
    await logToFile(`[LOGIN] Login successful for user: ${email}. Creating session.`);
    await createSession(user);

  } catch (error) {
    await logToFile(`[LOGIN] An unexpected error occurred during login: ${error}`);
    return { error: 'An unexpected error occurred.' };
  }
  
  redirect('/bookings');
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

    try {
        const db = await getDb();
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return { error: 'A user with this email already exists.' };
        }

        const salt = Buffer.from(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)));
        const key = await scryptJs.scrypt(Buffer.from(password, 'utf-8'), salt, 16384, 8, 1, 64);
        const hashedPassword = `${salt.toString('hex')}:${(key as Buffer).toString('hex')}`;
        const userId = `user-${randomUUID()}`;

        const stmt = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
        stmt.run(userId, name, email, hashedPassword, 'guest');
        
        await logToFile(`[SIGNUP] New user created: ${email}`);
        await createSession({ id: userId, name, email, role: 'guest' });

    } catch (error) {
        await logToFile(`[SIGNUP] Error: ${error}`);
        return { error: 'An unexpected error occurred during signup.' };
    }
    
    redirect('/bookings');
}
