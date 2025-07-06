
'use server';

import { scrypt as _scrypt, timingSafeEqual, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(_scrypt);

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const hash = `${salt}:${derivedKey.toString('hex')}`;
    console.log(`[HASH] Hashing password. Salt: ${salt}`);
    return hash;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    
    console.log(`[VERIFY] Verifying password.`);
    
    const [salt, storedKeyHex] = hash.split(':');
    if (!salt || !storedKeyHex) {
        console.log('[VERIFY] Hash format is invalid.');
        return false;
    }

    const storedKey = Buffer.from(storedKeyHex, 'hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    if (derivedKey.length !== storedKey.length) {
        console.log(`[VERIFY] Key length mismatch. Buffer lengths - derived: ${derivedKey.length}, stored: ${storedKey.length}`);
        return false;
    }

    const match = timingSafeEqual(derivedKey, storedKey);
    console.log(`[VERIFY] Password match result: ${match}`);
    return match;
}
