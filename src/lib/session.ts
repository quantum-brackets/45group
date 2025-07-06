'use server'

import 'server-only';
import { cookies } from 'next/headers';
import type { User } from './types';
import { getDb } from './db';
import { randomUUID } from 'crypto';

export async function createSession(user: User) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionId = randomUUID();

  try {
      const db = await getDb();
      const stmt = db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)');
      stmt.run(sessionId, user.id, expires.toISOString());

      cookies().set('session', sessionId, { 
        expires, 
        httpOnly: true, 
        path: '/' 
      });
      console.log(`[SESSION_CREATE] Session created for user ${user.id} with token ${sessionId}`);
  } catch (error) {
      console.error(`[SESSION_CREATE] Error creating session for user ${user.id}: ${error}`);
  }
}

export async function getSession(): Promise<User | null> {
  const sessionId = cookies().get('session')?.value;
  if (!sessionId) {
    return null;
  }
  
  try {
    const db = await getDb();
    
    // Join sessions and users table to get user data directly
    const stmt = db.prepare(`
      SELECT u.id, u.name, u.email, u.role 
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.id = ? AND s.expiresAt > ?
    `);

    const sessionData = stmt.get(sessionId, new Date().toISOString()) as User | undefined;

    if (!sessionData) {
      // Session not found or expired, clean up
      await deleteSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error(`[SESSION_GET] Error validating session ${sessionId}: ${error}`);
    return null;
  }
}

export async function deleteSession() {
  const sessionId = cookies().get('session')?.value;
  if (sessionId) {
    try {
        const db = await getDb();
        const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
        stmt.run(sessionId);
    } catch (error) {
        console.error(`[SESSION_DELETE] Error deleting session ${sessionId} from database: ${error}`);
    }
  }
  // Always clear the cookie
  cookies().set('session', '', { expires: new Date(0), path: '/' });
}
