'use strict';
/**
 * Where counted inspections go.
 *   mongo: straight to MongoDB Atlas (port 27017)
 *   http:  POST to the dashboard's /api/ingest over HTTPS (port 443), for networks that block 27017
 * Both return { ok, error, reject } from insertMany: reject = the batch itself was refused, retrying will not help.
 */
const { MongoClient } = require('mongodb');

const BATCH_TIMEOUT_MS = 10000;

function createMongoSink({ uri, dbName, log, explain = (e) => String(e && e.message) }) {
  let client = null;
  let inspections = null;
  let statusCol = null;

  async function connect() {
    let c = null;
    try {
      c = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000, appName: 'spdi-bridge' });
      await c.connect();
      const db = c.db(dbName);
      await db.command({ ping: 1 });
      const insp = db.collection('inspections');
      await insp.createIndex({ eventId: 1 }, { unique: true, name: 'eventId_unique' });
      await insp.createIndex({ ts: -1 }, { name: 'ts_desc' });
      await insp.createIndex({ line: 1, ts: -1 }, { name: 'line_ts' });
      client = c;
      inspections = insp;
      statusCol = db.collection('system_status');
      log(`🍃 MongoDB connected (db="${dbName}", indexes ready)`);
      return true;
    } catch (err) {
      log('❌ MongoDB connect failed:', explain(err));
      if (c) await c.close().catch(() => {});
      return false;
    }
  }

  async function insertMany(docs) {
    if (!inspections) return { ok: false, error: 'not connected' };
    try {
      await inspections.insertMany(
        docs.map((d) => ({ ...d, ts: new Date(d.ts), createdAt: new Date() })),
        { ordered: false }
      );
      return { ok: true };
    } catch (err) {
      // duplicate eventIds only: those boxes are already stored, the rest went in
      const writeErrors = (err && err.writeErrors) || [];
      if (err && (err.code === 11000 || (writeErrors.length && writeErrors.every((w) => w.code === 11000)))) {
        return { ok: true, duplicates: writeErrors.length || 1 };
      }
      return { ok: false, error: explain(err) };
    }
  }

  async function heartbeat(status, lineId) {
    if (!statusCol) return false;
    const id = lineId === 'line1' ? 'bridge' : `bridge:${lineId}`;
    const { offline, ...fields } = status;
    // offline: the bridge is stopping, an old updatedAt makes the dashboard show it as offline at once
    await statusCol.updateOne({ _id: id }, { $set: { ...fields, updatedAt: offline ? new Date(0) : new Date() } }, { upsert: true });
    return true;
  }

  return {
    name: 'mongo',
    connect,
    get ready() {
      return !!inspections;
    },
    insertMany,
    heartbeat,
    async close() {
      if (client) await client.close().catch(() => {});
    },
  };
}

function createHttpSink({ url, token, log }) {
  const base = url.replace(/\/+$/, '');
  let warnedAuth = false;

  async function post(body) {
    const res = await fetch(`${base}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error page */
    }
    return { status: res.status, data };
  }

  async function insertMany(docs) {
    try {
      const { status, data } = await post({ events: docs });
      if (status >= 200 && status < 300) return { ok: true, duplicates: (data && data.duplicates) || 0 };
      if (status === 401 || status === 403 || status === 404) {
        if (!warnedAuth) {
          warnedAuth = true;
          log(`❌ ingest API refused (${status}): check INGEST_URL and INGEST_TOKEN in bridge/.env and on Vercel`);
        }
        return { ok: false, error: `HTTP ${status}` };
      }
      if (status === 422) return { ok: false, reject: true, error: (data && data.error) || 'invalid events' };
      return { ok: false, error: `HTTP ${status}` };
    } catch (err) {
      return { ok: false, error: err.name === 'TimeoutError' ? 'timeout' : err.message };
    }
  }

  async function heartbeat(status, lineId) {
    const { status: code } = await post({ status: { ...status, line: lineId } });
    return code >= 200 && code < 300;
  }

  return {
    name: 'http',
    async connect() {
      log(`🌐 sending inspections over HTTPS to ${base}/api/ingest`);
      return true;
    },
    ready: true,
    insertMany,
    heartbeat,
    async close() {},
  };
}

module.exports = { createMongoSink, createHttpSink };
