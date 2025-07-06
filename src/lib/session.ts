
'use server'

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionPayload, User } from './types';

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-for-session';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    console.error('JWT Decryption Error:', error);
    return null;
  }
}

export async function createSession(user: User) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionPayload: SessionPayload = { 
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: expires.getTime() / 1000,
  };

  const session = await encrypt(sessionPayload);

  cookies().set('session', session, { expires, httpOnly: true });
}

export async function getSession(): Promise<SessionPayload | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function deleteSession() {
  cookies().delete('session');
}
