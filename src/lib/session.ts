
'use server'

import 'server-only';
import { cookies } from 'next/headers';
import type { User } from './types';
import { getDb } from './db';
import { randomUUID } from 'crypto';

/**
 * Creates a session record in the database.
 * @param userId The ID of the user to create the session for.
 * @returns The new session ID, or null if the operation fails.
 */
export async function createSession(userId: string): Promise<string | null> {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const sessionId = randomUUID();

  try {
    const db = await getDb();
    const stmt = db.prepare('INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)');
    const info = stmt.run(sessionId, userId, expires.toISOString());
    
    if (info.changes === 0) {
      console.error(`[SESSION_CREATE_FAIL] Failed to insert session for user ${userId}. No rows were changed.`);
      return null;
    }

    console.log(`[SESSION_CREATE] Session record created for user ${userId} with ID ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error(`[SESSION_CREATE_ERROR] Error creating session for user ${userId}:`, error);
    return null;
  }
}

export async function getSession(): Promise<User | null> {
  const sessionId = cookies().get('session')?.value;
  if (!sessionId) {
    return null;
  }
  
  try {
    const db = await getDb();
    
    const stmt = db.prepare(`
      SELECT u.id, u.name, u.email, u.role 
      FROM sessions s
      JOIN users u ON s.userId = u.id
      WHERE s.id = ? AND s.expiresAt > ?
    `);

    const sessionData = stmt.get(sessionId, new Date().toISOString()) as User | undefined;

    if (!sessionData) {
      // The session ID is invalid or expired.
      // We will delete the cookie to prevent the user from being stuck.
      cookies().set('session', '', { expires: new Date(0), path: '/' });
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
  cookies().set('session', '', { expires: new Date(0), path: '/' });
}
