import 'server-only';
import type { User } from './types';
import { getDb } from './db';

export async function getUserFromSessionId(sessionId: string): Promise<User | null> {
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

    return sessionData || null;
  } catch (error) {
    console.error(`[SESSION_GET_BY_ID] Error validating session ${sessionId}: ${error}`);
    return null;
  }
}
