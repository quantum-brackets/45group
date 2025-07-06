
declare module 'scrypt-js' {
  export function scrypt(password: Buffer, salt: Buffer, N: number, r: number, p: number, dkLen: number): Promise<Buffer>;
  export function acompare(buf1: Buffer, buf2: Buffer): Promise<boolean>;
}
