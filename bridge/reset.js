'use strict';
/**
 * Delete ALL documents in the `inspections` collection (asks y/N first).
 *   node reset.js         -> asks for confirmation
 *   node reset.js --yes   -> no question (careful!)
 */
const readline = require('readline');
const { MongoClient } = require('mongodb');
const { config, requireMongo } = require('./config');

requireMongo();

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000, appName: 'spdi-reset' });
  try {
    await client.connect();
    const col = client.db(config.dbName).collection('inspections');
    const n = await col.countDocuments();
    if (n === 0) {
      console.log(`ℹ️  "${config.dbName}.inspections" is already empty.`);
      return;
    }
    const yes = process.argv.includes('--yes');
    const answer = yes ? 'y' : await ask(`⚠️  ลบข้อมูลการตรวจทั้งหมด ${n} รายการใน "${config.dbName}.inspections"? (y/N) `);
    if (String(answer).trim().toLowerCase() !== 'y') {
      console.log('❎ ยกเลิก ไม่ได้ลบอะไร');
      return;
    }
    const res = await col.deleteMany({});
    console.log(`🗑️  ลบแล้ว ${res.deletedCount} รายการ`);
  } catch (err) {
    console.error('❌ reset failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
}

main();
