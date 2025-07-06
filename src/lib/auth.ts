
'use server'

import { z } from 'zod';
import { getDb } from './db';
import * as scryptJs from 'scrypt-js';
import { createSession } from './session';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';
import type { User } from './types';

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
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user || !user.password) {
      return { error: 'Invalid email or password.' };
    }
    
    const [salt, storedKey] = user.password.split(':');
    const saltBuffer = Buffer.from(salt, 'hex');
    const inputKey = await scryptJs.scrypt(Buffer.from(password, 'utf-8'), saltBuffer, 16384, 8, 1, 64);
    
    const passwordsMatch = await scryptJs.acompare(inputKey as Buffer, Buffer.from(storedKey, 'hex'));

    if (!passwordsMatch) {
      return { error: 'Invalid email or password.' };
    }
    
    await createSession(user);

  } catch (error) {
    console.error(error);
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
        
        await createSession({ id: userId, name, email, role: 'guest' });

    } catch (error) {
        console.error(error);
        return { error: 'An unexpected error occurred during signup.' };
    }
    
    redirect('/bookings');
}
