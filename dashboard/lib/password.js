/**
 * Password hashing with scrypt (Node crypto, server only).
 * Stored format: scrypt:<N>:<salt base64>:<hash base64>
 * Make a hash with:  node tools/hash-password.mjs
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb);
const KEYLEN = 64;

export async function hashPassword(password, N = 16384) {
  const salt = randomBytes(16);
  const hash = await scrypt(String(password), salt, KEYLEN, { N, r: 8, p: 1 });
  return `scrypt:${N}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  if (!Number.isInteger(N) || N < 1024 || N > 1048576) return false;
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  if (expected.length !== KEYLEN || typeof password !== 'string' || password.length > 256) return false;
  const got = await scrypt(password, salt, KEYLEN, { N, r: 8, p: 1, maxmem: 256 * N * 8 + 1024 * 1024 });
  return timingSafeEqual(got, expected);
}
