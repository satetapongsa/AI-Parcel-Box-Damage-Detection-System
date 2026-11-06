'use strict';
/**
 * SPDI Control Center: a small local web page to start / stop every part of
 * the system and run the tools. No extra packages needed.
 *
 *   node tools/control/server.js            open the panel
 *   node tools/control/server.js --all      open the panel and start everything (simulator)
 *   node tools/control/server.js --all-cira open the panel and start everything for real CiRA
 *
 * Listens on 127.0.0.1 only (this computer). Every log line is also printed in
 * the terminal with a [name] prefix.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BRIDGE = path.join(ROOT, 'bridge');
const DASH = path.join(ROOT, 'dashboard');
const PORT = Number(process.env.CONTROL_PORT || 3100);
const NODE = process.execPath;
const MAX_LINES = 500;
const WOKWI_URL = 'https://wokwi.com/projects/479947280939592705';

// ---------------------------------------------------------------- what can run
const SERVICES = {
  broker:    { label: 'MQTT broker',            hint: 'dev broker on :1883 (uses Mosquitto if it already runs)', cwd: BRIDGE, args: ['dev-broker.js'] },
  bridge:    { label: 'Bridge',                 hint: 'tracks + counts boxes, saves to MongoDB',                 cwd: BRIDGE, args: ['index.js'] },
  sim:       { label: 'Simulator',              hint: 'fake CiRA frames (box_good / dent / tear)',               cwd: BRIDGE, args: ['simulator.js', 'frames'] },
  dashboard: { label: 'Dashboard',              hint: 'Next.js web on http://localhost:3000',                    cwd: DASH,   args: [path.join(DASH, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '3000'] },
  relay:     { label: 'ESP32 relay',            hint: 'forwards real results to Wokwi',                          cwd: BRIDGE, args: ['relay.js'], conflicts: ['relaytest'] },
  relaytest: { label: 'ESP32 test',             hint: 'fake PASS/FAIL every 3 s to Wokwi',                       cwd: BRIDGE, args: ['relay.js', '--test'], conflicts: ['relay'] },
  sniff:     { label: 'MQTT sniff',             hint: 'prints every message on spdi/#',                          cwd: BRIDGE, args: ['sniff.js'] },
};
const PRESETS = {
  all:     ['broker', 'bridge', 'sim', 'dashboard', 'relay'],
  allcira: ['broker', 'bridge', 'dashboard', 'relay'],
};

const procs = {};   // id -> child process
const logs = {};    // id -> [lines]
const status = {};  // id -> { state, pid, since, code }
for (const id of Object.keys(SERVICES)) status[id] = { state: 'stopped' };
const tasks = {};   // running one-shot tools: id -> child

// ---------------------------------------------------------------- live updates (SSE)
const clients = new Set();
function broadcast(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
function addLog(id, text) {
  const lines = String(text).replace(ANSI, '').split(/\r?\n/);
  const buf = (logs[id] ||= []);
  for (const line of lines) {
    if (!line.trim()) continue;
    if (id === 'dashboard' && /^\s*(GET|HEAD|POST) \//.test(line)) continue; // per-request noise
    buf.push(line);
    if (buf.length > MAX_LINES) buf.shift();
    process.stdout.write(`[${id}] ${line}\n`);
    broadcast('log', { id, line });
  }
}

function setStatus(id, patch) {
  status[id] = { ...status[id], ...patch };
  broadcast('status', { id, ...status[id] });
}

// ---------------------------------------------------------------- process control
function run(id, cmd, args, cwd, onExit) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
  child.stdout.on('data', (d) => addLog(id, d));
  child.stderr.on('data', (d) => addLog(id, d));
  child.on('error', (err) => addLog(id, `❌ could not start: ${err.message}`));
  child.on('exit', (code, signal) => onExit(code, signal));
  return child;
}

function startService(id) {
  const svc = SERVICES[id];
  if (!svc) return { ok: false, error: 'unknown service' };
  if (procs[id]) return { ok: true, already: true };
  for (const other of svc.conflicts || []) if (procs[other]) stopService(other);
  if (id === 'dashboard' && !fs.existsSync(svc.args[0])) {
    addLog(id, '❌ dashboard is not installed yet: run 1-SETUP.bat (or the Setup button)');
    return { ok: false, error: 'not installed' };
  }
  addLog(id, `▶ start: ${svc.label}`);
  const child = run(id, NODE, svc.args, svc.cwd, (code, signal) => {
    delete procs[id];
    const wanted = status[id].state === 'stopping';
    addLog(id, wanted ? '■ stopped' : `⚠️ exited (code ${code ?? signal})`);
    setStatus(id, { state: wanted || code === 0 ? 'stopped' : 'crashed', pid: null, code });
  });
  procs[id] = child;
  setStatus(id, { state: 'running', pid: child.pid, since: Date.now(), code: null });
  return { ok: true };
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
  else child.kill('SIGTERM');
}

function stopService(id) {
  const child = procs[id];
  if (!child) {
    if (status[id]?.state === 'crashed') setStatus(id, { state: 'stopped' });
    return { ok: true, already: true };
  }
  setStatus(id, { state: 'stopping' });
  killTree(child);
  return { ok: true };
}

async function startPreset(name) {
  const ids = PRESETS[name];
  if (!ids) return { ok: false, error: 'unknown preset' };
  // a preset is the whole line-up: stop what is not part of it (e.g. the simulator for CiRA)
  for (const id of Object.keys(procs)) if (!ids.includes(id) && id !== 'sniff') stopService(id);
  if (ids.includes('broker')) {
    startService('broker');
    await new Promise((r) => setTimeout(r, 1200)); // let the broker bind first
  }
  for (const id of ids) if (id !== 'broker') startService(id);
  return { ok: true };
}

function stopAll() {
  for (const id of Object.keys(procs)) stopService(id);
  for (const t of Object.values(tasks)) killTree(t);
  return { ok: true };
}

// ---------------------------------------------------------------- one-shot tools
function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}
const clean = (p) => String(p || '').trim().replace(/^"+|"+$/g, '');
const DEFAULT_FRAMES = path.join(ROOT, 'box_good', 'dataset_frames');

function startTask(name, body) {
  if (tasks[name]) return { ok: false, error: 'already running' };
  let cmd = NODE, args, cwd = ROOT, shell = false;

  if (name === 'tests') {
    args = ['--test', 'tests/tracker.test.js']; cwd = BRIDGE;
  } else if (name === 'reset') {
    if (body.confirm !== 'RESET') return { ok: false, error: 'type RESET to confirm' };
    args = ['reset.js', '--yes']; cwd = BRIDGE;
  } else if (name === 'label' || name === 'convert') {
    const folder = clean(body.folder) || DEFAULT_FRAMES;
    if (!isDir(folder)) return { ok: false, error: `folder not found: ${folder}` };
    cmd = 'py';
    args = [path.join(ROOT, 'tools', 'auto_label', 'auto_label.py'), folder];
    if (name === 'convert') args.push('--convert-text');
    else args.push(...(String(body.options || '--preview').split(/\s+/).filter(Boolean)));
  } else if (name === 'video') {
    const input = clean(body.input), images = clean(body.images);
    const output = clean(body.output) || 'conveyor_mixed.mp4';
    if (!isFile(input)) return { ok: false, error: `video not found: ${input || '(empty)'}` };
    if (!isDir(images)) return { ok: false, error: `images folder not found: ${images || '(empty)'}` };
    cmd = 'py';
    args = [path.join(ROOT, 'tools', 'make_video.py'), '--input', input, '--images', images, '--output', output];
  } else if (name === 'setup') {
    cmd = 'npm run setup'; args = []; shell = true; // fixed command, no user input
  } else {
    return { ok: false, error: 'unknown tool' };
  }

  const id = `tool:${name}`;
  logs[id] = [];
  addLog(id, `▶ ${name} ...`);
  broadcast('task', { name, running: true });
  const child = spawn(cmd, args, { cwd, shell, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
  tasks[name] = child;
  child.stdout.on('data', (d) => addLog(id, d));
  child.stderr.on('data', (d) => addLog(id, d));
  child.on('error', (err) => addLog(id, `❌ could not start: ${err.message}${cmd === 'py' ? ' (is Python installed?)' : ''}`));
  child.on('close', (code) => {
    delete tasks[name];
    addLog(id, code === 0 ? '✅ done' : `⚠️ finished with code ${code}`);
    broadcast('task', { name, running: false, code });
  });
  return { ok: true, log: id };
}

// ---------------------------------------------------------------- health of the running system
let health = { dashboard: null, checkedAt: 0 };
function readRelayTopic() {
  try {
    const m = fs.readFileSync(path.join(BRIDGE, '.env'), 'utf8').match(/^RELAY_TOPIC=(.*)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}
function checkHealth() {
  const req = http.get({ host: '127.0.0.1', port: 3000, path: '/api/stats', timeout: 4000 }, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      try {
        const j = JSON.parse(body);
        health = { dashboard: j.ok ? 'ok' : 'error', counts: j.counts, error: j.ok ? null : j.error, checkedAt: Date.now() };
      } catch {
        health = { dashboard: 'starting', checkedAt: Date.now() };
      }
      broadcast('health', health);
    });
  });
  req.on('timeout', () => req.destroy());
  req.on('error', () => {
    health = { dashboard: 'down', checkedAt: Date.now() };
    broadcast('health', health);
  });
}
setInterval(checkHealth, 4000).unref();

// ---------------------------------------------------------------- http
function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => {
      b += c;
      if (b.length > 1e5) req.destroy();
    });
    req.on('end', () => {
      try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
    });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function snapshot() {
  return {
    services: Object.fromEntries(Object.entries(SERVICES).map(([id, s]) => [id, { label: s.label, hint: s.hint, ...status[id] }])),
    tasks: Object.keys(tasks),
    logs,
    health,
    relayTopic: readRelayTopic(),
    wokwiUrl: WOKWI_URL,
  };
}

const PAGE = path.join(__dirname, 'index.html');
const server = http.createServer(async (req, res) => {
  // only this computer, and only our own page may call the API
  const host = (req.headers.host || '').split(':')[0];
  if (!['127.0.0.1', 'localhost'].includes(host)) return json(res, 403, { ok: false, error: 'local only' });
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(PAGE).pipe(res);
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot());
  if (req.method === 'GET' && url.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': hello\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'POST') {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) return json(res, 403, { ok: false, error: 'bad origin' });
    const body = await readBody(req);
    const [, kind, a, b] = url.pathname.split('/'); // /api/<kind>/<a>/<b>
    if (kind !== 'api') return json(res, 404, { ok: false });
    if (a === 'start' && b) return json(res, 200, startService(b));
    if (a === 'stop' && b) return json(res, 200, stopService(b));
    if (a === 'preset' && b) return json(res, 200, await startPreset(b));
    if (a === 'stopall') return json(res, 200, stopAll());
    if (a === 'tool' && b) return json(res, 200, startTask(b, body));
    if (a === 'clear' && b) {
      logs[b] = [];
      return json(res, 200, { ok: true });
    }
  }
  json(res, 404, { ok: false, error: 'not found' });
});

function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { windowsHide: true, detached: true }).unref();
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true }).unref();
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️  Control Center already runs on http://localhost:${PORT} -> opening it`);
    openBrowser(`http://localhost:${PORT}`);
    setTimeout(() => process.exit(0), 500);
    return;
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', async () => {
  const url = `http://localhost:${PORT}`;
  console.log('==========================================================');
  console.log(`  SPDI Control Center  ->  ${url}`);
  console.log('  Close this window (or Ctrl+C) to stop everything.');
  console.log('==========================================================');
  openBrowser(url);
  checkHealth();
  if (process.argv.includes('--all')) await startPreset('all');
  else if (process.argv.includes('--all-cira')) await startPreset('allcira');
});

let exiting = false;
function shutdown() {
  if (exiting) return;
  exiting = true;
  console.log('\n👋 stopping everything ...');
  stopAll();
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown); // terminal window closed (Windows)
