'use server';

import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${buf.toString('hex')}`;
}

export async function verifyPassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
  if (!storedPassword || !suppliedPassword) {
    return false;
  }
  const [salt, key] = storedPassword.split('.');
  if (!salt || !key) {
    console.error('Invalid stored password format.');
    return false;
  }
  const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');

  if (buf.length !== keyBuffer.length) {
    return false;
  }

  return timingSafeEqual(buf, keyBuffer);
}
