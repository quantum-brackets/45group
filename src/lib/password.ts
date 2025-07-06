
'use server';

import { scrypt as _scrypt, timingSafeEqual, randomBytes } from 'crypto';
import { promisify } from 'util';
import { logToFile } from './logger';

const scryptAsync = promisify(_scrypt);

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const hash = `${salt}:${derivedKey.toString('hex')}`;
    await logToFile(`[HASH] Hashing password. Salt: ${salt}, Hash: ${hash}`);
    return hash;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    
    await logToFile(`[VERIFY] Verifying password. Provided hash: ${hash}`);
    
    const [salt, storedKeyHex] = hash.split(':');
    if (!salt || !storedKeyHex) {
        await logToFile('[VERIFY] Hash format is invalid.');
        return false;
    }

    const storedKey = Buffer.from(storedKeyHex, 'hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    await logToFile(`[VERIFY] Salt from hash: ${salt}`);
    await logToFile(`[VERIFY] Key from hash: ${storedKey.toString('hex')}`);
    await logToFile(`[VERIFY] Generated key from input: ${derivedKey.toString('hex')}`);

    if (derivedKey.length !== storedKey.length) {
        await logToFile(`[VERIFY] Key length mismatch. Buffer lengths - derived: ${derivedKey.length}, stored: ${storedKey.length}`);
        return false;
    }

    const match = timingSafeEqual(derivedKey, storedKey);
    await logToFile(`[VERIFY] Password match result: ${match}`);
    return match;
}
