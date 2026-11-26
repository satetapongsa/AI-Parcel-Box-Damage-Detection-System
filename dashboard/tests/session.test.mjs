import test from 'node:test';
import assert from 'node:assert/strict';
import { authEnabled, createSessionValue, verifySessionValue } from '../lib/session.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

process.env.SESSION_SECRET = 's'.repeat(40);

test('a signed session is valid until it expires', async () => {
  const now = Date.now();
  const v = await createSessionValue(now);
  assert.equal(await verifySessionValue(v, now + 1000), true);
  assert.equal(await verifySessionValue(v, now + 13 * 3600 * 1000), false);
});

test('a changed or foreign cookie is refused', async () => {
  const v = await createSessionValue();
  const [payload, sig] = v.split('.');
  const forged = Buffer.from(JSON.stringify({ exp: Date.now() + 9e9 })).toString('base64url');
  assert.equal(await verifySessionValue(`${forged}.${sig}`), false);
  assert.equal(await verifySessionValue(`${payload}.${sig}x`), false);
  assert.equal(await verifySessionValue('garbage'), false);
  process.env.SESSION_SECRET = 'o'.repeat(40);
  assert.equal(await verifySessionValue(v), false);
  process.env.SESSION_SECRET = 's'.repeat(40);
});

test('login is off unless both env values are set', () => {
  delete process.env.DASHBOARD_PASSWORD_HASH;
  assert.equal(authEnabled(), false);
  process.env.DASHBOARD_PASSWORD_HASH = 'scrypt:16384:x:y';
  assert.equal(authEnabled(), true);
});

test('scrypt password hash verifies only the right password', async () => {
  const h = await hashPassword('correct horse battery', 1024);
  assert.match(h, /^scrypt:1024:/);
  assert.equal(await verifyPassword('correct horse battery', h), true);
  assert.equal(await verifyPassword('wrong', h), false);
  assert.equal(await verifyPassword('x', 'plain-text'), false);
});
