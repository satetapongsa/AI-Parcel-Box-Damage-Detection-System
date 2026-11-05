import { MongoClient } from 'mongodb';

/**
 * Cached MongoClient stored on globalThis so that:
 *  - Next.js dev hot-reload does not open a new pool on every change
 *  - Vercel serverless warm instances reuse the same connection
 * Server-only: never import this file from a 'use client' component.
 */
const OPTIONS = {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  appName: 'spdi-dashboard',
};

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set (dashboard/.env.local locally, or Vercel Environment Variables)');
  }
  const g = globalThis;
  if (!g.__spdiMongo) {
    const client = new MongoClient(uri, OPTIONS);
    g.__spdiMongo = { client, promise: client.connect() };
  }
  // keep a local reference: parallel requests may reset the global entry
  const entry = g.__spdiMongo;
  try {
    await entry.promise;
  } catch (err) {
    // allow a fresh retry on the next request
    if (g.__spdiMongo === entry) g.__spdiMongo = null;
    entry.client.close().catch(() => {});
    throw err;
  }
  return entry.client.db(process.env.DB_NAME || 'spdi');
}

/** Turn a driver error into a short, secret-free message for the UI. */
export function friendlyError(err) {
  const msg = String((err && err.message) || err);
  if (/MONGODB_URI is not set/.test(msg)) return msg;
  if (/bad auth|authentication failed/i.test(msg)) return 'MongoDB authentication failed (check user/password in MONGODB_URI)';
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) return 'Cannot resolve MongoDB host (check cluster name / internet / DNS)';
  if (/Server selection timed out|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return 'Cannot reach MongoDB (Atlas Network Access IP list? internet?)';
  }
  return msg.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, 'mongodb://***').slice(0, 200);
}
