
'use server';

import * as scryptJs from 'scrypt-js';
import { timingSafeEqual, randomBytes } from 'crypto';
import { logToFile } from './logger';

const scryptOptions = {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64
};

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptJs.scrypt(Buffer.from(password, 'utf-8'), salt, scryptOptions.N, scryptOptions.r, scryptOptions.p, scryptOptions.dkLen) as Buffer;
    const hash = `${salt.toString('hex')}:${key.toString('hex')}`;
    await logToFile(`[HASH] Hashing password. Salt: ${salt.toString('hex')}, Hash: ${hash}`);
    return hash;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    
    await logToFile(`[VERIFY] Verifying password. Provided hash: ${hash}`);
    
    const [saltHex, storedKeyHex] = hash.split(':');
    if (!saltHex || !storedKeyHex) {
        await logToFile('[VERIFY] Hash format is invalid.');
        return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(storedKeyHex, 'hex');

    const inputKey = await scryptJs.scrypt(Buffer.from(password, 'utf-8'), salt, scryptOptions.N, scryptOptions.r, scryptOptions.p, scryptOptions.dkLen) as Buffer;
    
    await logToFile(`[VERIFY] Salt from hash: ${salt.toString('hex')}`);
    await logToFile(`[VERIFY] Key from hash: ${storedKey.toString('hex')}`);
    await logToFile(`[VERIFY] Generated key from input: ${inputKey.toString('hex')}`);

    if (inputKey.length !== storedKey.length) {
        await logToFile('[VERIFY] Key length mismatch.');
        return false;
    }

    const match = timingSafeEqual(inputKey, storedKey);
    await logToFile(`[VERIFY] Password match result: ${match}`);
    return match;
}
