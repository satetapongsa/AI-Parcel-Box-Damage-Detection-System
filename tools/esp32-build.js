'use strict';
/**
 * Build the Wokwi ESP32 sketch into firmware for the Wokwi VS Code extension.
 *
 *   npm run esp32:build
 *
 * 1. copies esp32/wokwi/sketch.ino into esp32/wokwi/build/sketch/
 *    with this computer's RELAY_TOPIC (bridge/.env) filled in
 * 2. compiles it with arduino-cli for esp32:esp32:esp32
 * 3. writes esp32/wokwi/build/sketch.ino.bin + .elf (used by wokwi.toml)
 *
 * The build folder is git-ignored because it contains the real topic.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WOKWI = path.join(ROOT, 'esp32', 'wokwi');
const BUILD = path.join(WOKWI, 'build');
const SRC_DIR = path.join(BUILD, 'sketch');

function readEnv(key) {
  try {
    const text = fs.readFileSync(path.join(ROOT, 'bridge', '.env'), 'utf8');
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

function findCli() {
  const candidates = [
    process.env.ARDUINO_CLI,
    'C:\\Program Files\\Arduino CLI\\arduino-cli.exe',
    'arduino-cli',
  ].filter(Boolean);
  for (const c of candidates) {
    const r = spawnSync(c, ['version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const topic = readEnv('RELAY_TOPIC');
if (!/^[\w-]+(\/[\w-]+)*$/.test(topic)) {
  console.log('RELAY_TOPIC not found in bridge/.env. Run "npm run relay" once first, then build again.');
  process.exit(1);
}

const cli = findCli();
if (!cli) {
  console.log('arduino-cli not found. Install it: winget install ArduinoSA.CLI');
  process.exit(1);
}

fs.mkdirSync(SRC_DIR, { recursive: true });
const code = fs
  .readFileSync(path.join(WOKWI, 'sketch.ino'), 'utf8')
  .replace(/#define TOPIC_BASE\s+"[^"]*"/, `#define TOPIC_BASE   "${topic}"`);
fs.writeFileSync(path.join(SRC_DIR, 'sketch.ino'), code);

console.log(`Building ESP32 firmware (topic ${topic}) ...`);
const r = spawnSync(
  cli,
  ['compile', '--fqbn', 'esp32:esp32:esp32', '--output-dir', BUILD, SRC_DIR],
  { stdio: 'inherit' }
);
if (r.status !== 0) {
  console.log('\nBuild failed. If the board or libraries are missing, run: npm run esp32:setup');
  process.exit(r.status || 1);
}
console.log('\nDone: esp32/wokwi/build/sketch.ino.bin');
console.log('Open esp32/wokwi/diagram.json in VS Code, then F1 > "Wokwi: Start Simulator".');
