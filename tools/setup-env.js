'use strict';
/**
 * Setup wizard: asks for the MongoDB connection string (and optional class names)
 * and writes BOTH bridge/.env and dashboard/.env.local, so the user edits nothing by hand.
 *
 *   node tools/setup-env.js            (run from the spdi folder, or via 1-SETUP.bat)
 *   node tools/setup-env.js <rootDir>  (used for testing)
 *
 * Plain Node.js, no dependencies. Never prints the password back.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..');
const BRIDGE_ENV = path.join(root, 'bridge', '.env');
const BRIDGE_EXAMPLE = path.join(root, 'bridge', '.env.example');
const DASH_ENV = path.join(root, 'dashboard', '.env.local');
const DASH_EXAMPLE = path.join(root, 'dashboard', '.env.example');

function readEnv(file, fallback) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(fallback, 'utf8');
}

function getKey(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

function setKey(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(text)) return text.replace(re, () => line);
  return `${text.replace(/\s*$/, '')}\n${line}\n`;
}

function isPlaceholder(uri) {
  return !uri || uri.includes('<user>') || uri.includes('<password>') || uri.includes('<cluster>') || uri.includes('<db_password>');
}

// Atlas shows the string with <db_password> (or <password>) in it.
const PW_TOKEN = /<db_password>|<password>/;

function mask(uri) {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (q) => {
    process.stdout.write(q);
    const { value, done } = await lines.next();
    return done ? '' : String(value).trim();
  };

  let bridge = readEnv(BRIDGE_ENV, BRIDGE_EXAMPLE);
  let dash = readEnv(DASH_ENV, DASH_EXAMPLE);

  console.log('');
  console.log('==============================================');
  console.log('  SPDI setup - ตั้งค่าครั้งเดียว');
  console.log('==============================================');

  // ---- 1) MongoDB URI
  const current = getKey(bridge, 'MONGODB_URI');
  const hasCurrent = !isPlaceholder(current);
  console.log('');
  console.log('1) วาง MongoDB connection string จาก Atlas (Connect -> Drivers)');
  console.log('   หน้าตาแบบนี้: mongodb+srv://user:<db_password>@cluster0.xxxxx.mongodb.net/');
  console.log('   วางทั้งบรรทัดได้เลย ถ้ายังมี <db_password> อยู่ เดี๋ยวจะถามรหัสแยกให้');
  console.log('   (คลิกขวาในหน้าต่างนี้ = วาง)');
  if (hasCurrent) console.log(`   ค่าปัจจุบัน: ${mask(current)}  (กด Enter เพื่อใช้ค่าเดิม)`);

  let uri = '';
  for (let tries = 0; tries < 5; tries++) {
    uri = await ask('   MONGODB_URI = ');
    uri = uri.replace(/^["']|["']$/g, '');
    if (!uri && hasCurrent) {
      uri = current;
      break;
    }
    if (/^mongodb(\+srv)?:\/\//.test(uri) && PW_TOKEN.test(uri) && !uri.includes('<cluster>')) {
      // Ask for the password separately and URL-encode it (handles @ : / ? # % etc.)
      const pw = await ask('   รหัสผ่านของ Database User (พิมพ์แล้วกด Enter) = ');
      if (pw) {
        uri = uri.replace(PW_TOKEN, encodeURIComponent(pw));
        break;
      }
      console.log('   ❌ ยังไม่ได้ใส่รหัสผ่าน');
      uri = '';
      continue;
    }
    if (/^mongodb(\+srv)?:\/\//.test(uri) && !isPlaceholder(uri)) break;
    console.log('   ❌ ต้องขึ้นต้นด้วย mongodb+srv:// และเปลี่ยน <user> <password> <cluster> เป็นของจริง ลองอีกครั้ง');
    uri = '';
  }
  if (!uri) {
    console.log('\n❌ ยังไม่ได้ใส่ MONGODB_URI — รันไฟล์นี้ใหม่เมื่อพร้อม');
    rl.close();
    process.exitCode = 1;
    return;
  }

  // ---- 2) class names (optional)
  const good = getKey(bridge, 'GOOD_CLASSES');
  const bad = getKey(bridge, 'DAMAGED_CLASSES');
  console.log('');
  console.log('2) ชื่อ class ในโมเดล CiRA (ดูจาก node Debug) — ยังไม่รู้ก็กด Enter ข้ามไปก่อน');
  const newGood = await ask(`   ชื่อ class กล่องดี   [${good}] : `);
  const newBad = await ask(`   ชื่อ class กล่องเสีย [${bad}] : `);
  rl.close();

  bridge = setKey(bridge, 'MONGODB_URI', uri);
  if (newGood) bridge = setKey(bridge, 'GOOD_CLASSES', newGood.replace(/\s*,\s*/g, ','));
  if (newBad) bridge = setKey(bridge, 'DAMAGED_CLASSES', newBad.replace(/\s*,\s*/g, ','));
  dash = setKey(dash, 'MONGODB_URI', uri);
  dash = setKey(dash, 'DB_NAME', getKey(bridge, 'DB_NAME') || 'spdi');

  fs.writeFileSync(BRIDGE_ENV, bridge);
  fs.writeFileSync(DASH_ENV, dash);

  console.log('');
  console.log('✅ บันทึกแล้ว:');
  console.log(`   ${path.relative(root, BRIDGE_ENV)}`);
  console.log(`   ${path.relative(root, DASH_ENV)}`);
  console.log('   (2 ไฟล์นี้มีรหัสผ่าน ห้ามส่งให้ใคร / ห้าม push ขึ้น GitHub)');
  console.log('');
  console.log('ต่อไป: ดับเบิลคลิก 2-DEMO-SIM.bat เพื่อลองระบบ');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
