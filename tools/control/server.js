'use strict';
/**
 * SPDI Control Center: a small local web page to start / stop every part of
 * the system, see the whole pipeline live and run the tools.
 *
 *   node tools/control/server.js            open the panel
 *   node tools/control/server.js --all      open the panel and start everything (simulator)
 *   node tools/control/server.js --all-cira open the panel and start everything for real CiRA
 *   add --no-open to skip opening the browser
 *
 * Listens on 127.0.0.1 only (this computer). Every log line is also printed in
 * the terminal with a [name] prefix. Uses the mqtt package already installed in bridge/.
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

let mqtt = null;
try {
  mqtt = require(path.join(BRIDGE, 'node_modules', 'mqtt'));
} catch {
  console.log('WARN bridge/node_modules/mqtt not found (run 1-SETUP.bat) - pipeline checks for MQTT/ESP32 are off');
}

// ---------------------------------------------------------------- what can run
const SERVICES = {
  broker:    { label: 'MQTT broker', hint: 'dev broker on :1883 (uses Mosquitto if it already runs)', cwd: BRIDGE, args: ['dev-broker.js'] },
  bridge:    { label: 'Bridge',      hint: 'tracks + counts boxes, saves to MongoDB',                 cwd: BRIDGE, args: ['index.js'] },
  sim:       { label: 'Simulator',   hint: 'fake CiRA frames (box_good / dent / tear)',               cwd: BRIDGE, args: ['simulator.js', 'frames'] },
  dashboard: { label: 'Dashboard',   hint: 'Next.js web on http://localhost:3000',                    cwd: DASH,   args: [path.join(DASH, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '3000'] },
  relay:     { label: 'ESP32 relay', hint: 'forwards real results to Wokwi',                          cwd: BRIDGE, args: ['relay.js'], conflicts: ['relaytest'] },
  relaytest: { label: 'ESP32 test',  hint: 'fake PASS/FAIL every 3 s to Wokwi',                       cwd: BRIDGE, args: ['relay.js', '--test'], conflicts: ['relay'] },
  sniff:     { label: 'MQTT sniff',  hint: 'prints every message on spdi/#',                          cwd: BRIDGE, args: ['sniff.js'] },
};
const PRESETS = {
  all:     ['broker', 'bridge', 'sim', 'dashboard', 'relay'],
  allcira: ['broker', 'bridge', 'dashboard', 'relay'],
};

// auto-restart: a service that dies on its own is started again (with a pause),
// at most MAX_RESTARTS times per RESTART_WINDOW_MS
let autoRestart = true;
const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60_000;
const RESTART_DELAY_MS = 2_000;

const procs = {};   // id -> child process
const logs = {};    // id -> [lines]
const status = {};  // id -> { state, pid, since, code, restarts }
const restartLog = {}; // id -> [timestamps]
const restartTimers = {};
for (const id of Object.keys(SERVICES)) status[id] = { state: 'stopped', restarts: 0 };
const tasks = {};   // running one-shot tools: name -> child
let busy = null;    // "fresh demo" in progress

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
function startService(id, { fromRestart = false } = {}) {
  const svc = SERVICES[id];
  if (!svc) return { ok: false, error: 'unknown service' };
  if (procs[id]) return { ok: true, already: true };
  clearTimeout(restartTimers[id]);
  if (!fromRestart) {
    restartLog[id] = [];
    status[id].restarts = 0;
  }
  for (const other of svc.conflicts || []) if (procs[other]) stopService(other);
  if (id === 'dashboard' && !fs.existsSync(svc.args[0])) {
    addLog(id, 'ERROR dashboard is not installed yet: run 1-SETUP.bat (or the Setup button)');
    setStatus(id, { state: 'crashed' });
    return { ok: false, error: 'not installed' };
  }
  addLog(id, `START ${svc.label}`);
  const child = spawn(NODE, svc.args, { cwd: svc.cwd, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
  child.stdout.on('data', (d) => addLog(id, d));
  child.stderr.on('data', (d) => addLog(id, d));
  child.on('error', (err) => addLog(id, `ERROR could not start: ${err.message}`));
  child.on('exit', (code, signal) => {
    delete procs[id];
    const wanted = status[id].state === 'stopping';
    if (wanted || exiting) {
      addLog(id, 'STOPPED');
      setStatus(id, { state: 'stopped', pid: null, code });
      return;
    }
    addLog(id, `WARN exited by itself (code ${code ?? signal})`);
    scheduleRestart(id, code);
  });
  procs[id] = child;
  setStatus(id, { state: 'running', pid: child.pid, since: Date.now(), code: null });
  return { ok: true };
}

function scheduleRestart(id, code) {
  const now = Date.now();
  const recent = (restartLog[id] || []).filter((t) => now - t < RESTART_WINDOW_MS);
  restartLog[id] = recent;
  if (!autoRestart || recent.length >= MAX_RESTARTS) {
    if (autoRestart) addLog(id, `ERROR crashed ${MAX_RESTARTS} times in a minute - not restarting. Check the log above.`);
    setStatus(id, { state: 'crashed', pid: null, code });
    return;
  }
  recent.push(now);
  setStatus(id, { state: 'restarting', pid: null, code, restarts: (status[id].restarts || 0) + 1 });
  addLog(id, `RESTART auto-restart in ${RESTART_DELAY_MS / 1000} s (${recent.length}/${MAX_RESTARTS})`);
  restartTimers[id] = setTimeout(() => {
    if (status[id].state === 'restarting') startService(id, { fromRestart: true });
  }, RESTART_DELAY_MS);
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
  else child.kill('SIGTERM');
}

function stopService(id) {
  clearTimeout(restartTimers[id]);
  const child = procs[id];
  if (!child) {
    if (['crashed', 'restarting'].includes(status[id]?.state)) setStatus(id, { state: 'stopped' });
    return { ok: true, already: true };
  }
  setStatus(id, { state: 'stopping' });
  killTree(child);
  return { ok: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startPreset(name) {
  const ids = PRESETS[name];
  if (!ids) return { ok: false, error: 'unknown preset' };
  // a preset is the whole line-up: stop what is not part of it (e.g. the simulator for CiRA)
  for (const id of Object.keys(SERVICES)) if (!ids.includes(id) && id !== 'sniff') stopService(id);
  if (ids.includes('broker')) {
    startService('broker');
    await sleep(1200); // let the broker bind first
  }
  for (const id of ids) if (id !== 'broker') startService(id);
  if (name === 'allcira') openCira(); // real system: also bring up CiRA CORE with our project
  return { ok: true };
}

// ---------------------------------------------------------------- CiRA CORE
const CIRA_PROJECT = path.join(ROOT, 'project.npj');
const CIRA_LAUNCHER = process.env.CIRA_LAUNCHER || 'C:\\CiRA-CORE\\exec\\ciracore_launch.exe';

// is a CiRA CORE window already open? (its helper "cira-module-*" programs do not count)
function ciraIsOpen() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true }, (err, out) => {
      if (err) return resolve(false);
      resolve(out.split(/\r?\n/).some((l) => /^"(cira|ciracore)[^"]*\.exe"/i.test(l) && !/cira-module/i.test(l)));
    });
  });
}

async function openCira() {
  const id = 'tool:cira';
  if (mon.frames.some((f) => f[1] === 'CiRA CORE') || (await ciraIsOpen())) {
    addLog(id, 'CiRA CORE is already open - press Run in CiRA if no frames arrive');
    return { ok: true, already: true };
  }
  if (!fs.existsSync(CIRA_PROJECT)) {
    addLog(id, `ERROR project file not found: ${CIRA_PROJECT}`);
    return { ok: false, error: 'project.npj not found' };
  }
  addLog(id, `Opening CiRA CORE with ${path.basename(CIRA_PROJECT)} - press Run in CiRA when it has loaded`);
  try {
    if (fs.existsSync(CIRA_LAUNCHER)) {
      spawn(CIRA_LAUNCHER, ['--file', CIRA_PROJECT], { cwd: path.dirname(CIRA_LAUNCHER), detached: true, stdio: 'ignore' }).unref();
    } else {
      // fall back to whatever program Windows uses for .npj files
      spawn('cmd', ['/c', 'start', '', CIRA_PROJECT], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    }
    return { ok: true };
  } catch (err) {
    addLog(id, `ERROR could not open CiRA CORE: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

function stopAll() {
  for (const id of Object.keys(SERVICES)) stopService(id);
  for (const t of Object.values(tasks)) killTree(t);
  return { ok: true };
}

async function waitAllStopped(timeoutMs = 8000) {
  const end = Date.now() + timeoutMs;
  while (Object.keys(procs).length && Date.now() < end) await sleep(200);
}

// "Fresh demo": stop everything, empty the database, start the chosen line-up
async function freshDemo(preset) {
  if (!PRESETS[preset]) return { ok: false, error: 'unknown preset' };
  if (busy) return { ok: false, error: 'already busy: ' + busy };
  busy = 'fresh demo';
  broadcast('busy', { busy });
  const id = 'tool:fresh';
  logs[id] = [];
  try {
    addLog(id, 'Fresh demo: stopping everything ...');
    stopAll();
    await waitAllStopped();
    addLog(id, 'Emptying the database ...');
    const code = await runToEnd(id, NODE, ['reset.js', '--yes'], BRIDGE);
    if (code !== 0) addLog(id, 'WARN reset failed (see above) - starting anyway');
    addLog(id, `Starting: ${PRESETS[preset].join(', ')}`);
    await startPreset(preset);
    addLog(id, 'DONE fresh demo is running');
    return { ok: true };
  } finally {
    busy = null;
    broadcast('busy', { busy });
  }
}

function runToEnd(id, cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
    child.stdout.on('data', (d) => addLog(id, d));
    child.stderr.on('data', (d) => addLog(id, d));
    child.on('error', (err) => {
      addLog(id, `ERROR ${err.message}`);
      resolve(1);
    });
    child.on('close', (code) => resolve(code));
  });
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
  } else if (name === 'shortcut') {
    args = [path.join(__dirname, 'make-shortcut.js')];
  } else if (name === 'setup') {
    cmd = 'npm run setup'; args = []; shell = true; // fixed command, no user input
  } else {
    return { ok: false, error: 'unknown tool' };
  }

  const id = `tool:${name}`;
  logs[id] = [];
  addLog(id, `START ${name} ...`);
  broadcast('task', { name, running: true });
  const child = spawn(cmd, args, { cwd, shell, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
  tasks[name] = child;
  child.stdout.on('data', (d) => addLog(id, d));
  child.stderr.on('data', (d) => addLog(id, d));
  child.on('error', (err) => addLog(id, `ERROR could not start: ${err.message}${cmd === 'py' ? ' (is Python installed?)' : ''}`));
  child.on('close', (code) => {
    delete tasks[name];
    addLog(id, code === 0 ? 'DONE' : `WARN finished with code ${code}`);
    broadcast('task', { name, running: false, code });
  });
  return { ok: true, log: id };
}

// ---------------------------------------------------------------- pipeline monitor
function readEnv(key) {
  try {
    const m = fs.readFileSync(path.join(BRIDGE, '.env'), 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}
const LINE_ID = readEnv('LINE_ID') || 'line1';
const LOCAL_MQTT = readEnv('MQTT_URL') || 'mqtt://127.0.0.1:1883';
const RELAY_URL = readEnv('RELAY_URL') || 'mqtt://broker.hivemq.com:1883';

const mon = {
  local: false,
  frames: [],            // [ts, source] for the last few seconds
  lastSourceName: null,
  lastCountedAt: 0,
  public: false,
  relayTopic: '',
  relayStatus: null,     // 'online' | 'offline' (retained, from relay.js)
  esp32: null,           // 'online' | 'offline'
  esp32Seen: 0,
  esp32Info: null,
  lastAckAt: 0,
};

let localClient = null;
let publicClient = null;
if (mqtt) {
  localClient = mqtt.connect(LOCAL_MQTT, { clientId: `spdi-control-${process.pid}`, reconnectPeriod: 2000, connectTimeout: 4000 });
  localClient.on('connect', () => {
    mon.local = true;
    localClient.subscribe([`spdi/${LINE_ID}/detections`, `spdi/${LINE_ID}/counted`]);
  });
  localClient.on('close', () => (mon.local = false));
  localClient.on('error', () => {});
  localClient.on('message', (topic, buf) => {
    const now = Date.now();
    if (topic.endsWith('/counted')) {
      mon.lastCountedAt = now;
      return;
    }
    // cheap check without parsing (CiRA frames can carry a whole JPEG)
    const head = buf.subarray(0, 400).toString();
    const src = head.includes('"source":"simulator"') || head.includes('"device":"sim') ? 'Simulator' : 'CiRA CORE';
    mon.frames.push([now, src]);
    mon.lastSourceName = src;
    while (mon.frames.length && now - mon.frames[0][0] > 3000) mon.frames.shift();
  });
}

function connectPublic() {
  const topic = readEnv('RELAY_TOPIC');
  if (!mqtt || !topic || topic === mon.relayTopic) return;
  if (publicClient) publicClient.end(true);
  mon.relayTopic = topic;
  mon.relayStatus = null;
  mon.esp32 = null;
  publicClient = mqtt.connect(RELAY_URL, { clientId: `spdi-control-${process.pid}-${Date.now() % 1e5}`, reconnectPeriod: 5000, connectTimeout: 10000 });
  publicClient.on('connect', () => {
    mon.public = true;
    publicClient.subscribe([`${topic}/status`, `${topic}/esp32`, `${topic}/ack`]);
  });
  publicClient.on('close', () => (mon.public = false));
  publicClient.on('error', () => {});
  publicClient.on('message', (t, buf) => {
    const s = buf.toString();
    if (t.endsWith('/status')) mon.relayStatus = s;
    else if (t.endsWith('/ack')) {
      mon.lastAckAt = Date.now();
      mon.esp32Seen = Date.now();
      mon.esp32 = 'online';
    } else if (t.endsWith('/esp32')) {
      if (s === 'offline') {
        mon.esp32 = 'offline';
        return;
      }
      mon.esp32 = 'online';
      mon.esp32Seen = Date.now();
      try { mon.esp32Info = JSON.parse(s); } catch { mon.esp32Info = null; }
    }
  });
}
connectPublic();
setInterval(connectPublic, 10_000).unref(); // RELAY_TOPIC appears after the first relay run

let health = { dashboard: null, checkedAt: 0 };
function checkHealth() {
  const req = http.get({ host: '127.0.0.1', port: 3000, path: '/api/stats', timeout: 4000 }, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      try {
        const j = JSON.parse(body);
        health = { dashboard: j.ok ? 'ok' : 'error', counts: j.counts, status: j.status, error: j.ok ? null : j.error, checkedAt: Date.now() };
      } catch {
        health = { dashboard: 'starting', checkedAt: Date.now() };
      }
    });
  });
  req.on('timeout', () => req.destroy());
  req.on('error', () => (health = { dashboard: 'down', checkedAt: Date.now() }));
}

const ago = (t) => {
  if (!t) return 'never';
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
};

// one check per part of the line: { state: ok | warn | off | error, detail }
function pipeline() {
  const now = Date.now();
  const running = (id) => !!procs[id];
  const fpsOf = (src) => mon.frames.filter((f) => f[1] === src).length / 3;
  const fpsSim = fpsOf('Simulator');
  const fpsCira = fpsOf('CiRA CORE');
  const st = health.status;
  const bridgeAge = st && st.updatedAt ? now - Date.parse(st.updatedAt) : Infinity;
  const espAge = mon.esp32Seen ? now - mon.esp32Seen : Infinity;
  const relayOn = running('relay') || running('relaytest');
  const c = {};

  c.sim = fpsSim > 0
    ? { state: 'ok', detail: `${fpsSim.toFixed(0)} frames/s` }
    : { state: running('sim') ? 'warn' : 'off', detail: running('sim') ? 'starting' : 'not running' };
  c.cira = fpsCira > 0
    ? { state: 'ok', detail: `${fpsCira.toFixed(0)} frames/s` }
    : { state: 'off', detail: 'open CiRA CORE and press Run' };
  c.broker = mon.local
    ? { state: 'ok', detail: 'port 1883' }
    : { state: running('broker') ? 'warn' : 'error', detail: 'not reachable on port 1883' };
  c.bridge = bridgeAge < 10_000
    ? { state: 'ok', detail: mon.lastCountedAt ? `last box ${ago(mon.lastCountedAt)}` : 'waiting for boxes' }
    : { state: running('bridge') ? 'warn' : 'off', detail: running('bridge') ? 'waiting for heartbeat' : 'not running' };
  c.db = health.dashboard === 'ok'
    ? { state: 'ok', detail: `${health.counts?.total ?? 0} boxes stored` }
    : health.dashboard === 'error'
      ? { state: 'error', detail: String(health.error || 'cannot connect').slice(0, 70) }
      : { state: 'off', detail: 'checked through the dashboard' };
  c.dash = health.dashboard === 'ok' || health.dashboard === 'error'
    ? { state: 'ok', detail: 'localhost:3000' }
    : { state: running('dashboard') ? 'warn' : 'off', detail: running('dashboard') ? 'starting' : 'not running' };
  c.relay = mon.relayStatus === 'online' && relayOn
    ? { state: 'ok', detail: running('relaytest') ? 'TEST mode: fake boxes' : 'HiveMQ connected' }
    : { state: relayOn ? 'warn' : 'off', detail: relayOn ? 'connecting to HiveMQ' : 'not running' };
  c.esp32 = mon.esp32 === 'online' && espAge < 30_000
    ? { state: 'ok', detail: `online${mon.esp32Info ? ` · dent ${mon.esp32Info.dent ?? 0} · tear ${mon.esp32Info.tear ?? 0}` : ''}` }
    : { state: mon.esp32 === 'online' ? 'warn' : 'off', detail: mon.esp32 === 'online' ? `quiet since ${ago(mon.esp32Seen)}` : 'press Play in Wokwi' };

  return {
    checks: c,
    fps: { sim: fpsSim, cira: fpsCira },
    mode: fpsCira > 0 && fpsSim > 0 ? 'both' : fpsCira > 0 ? 'cira' : fpsSim > 0 || running('sim') ? 'sim' : null,
    conflict: fpsCira > 0 && fpsSim > 0,
  };
}

// local machine: refresh once per second
setInterval(() => {
  checkHealth();
  broadcast('pipeline', { ...pipeline(), health, now: Date.now() });
}, 1000).unref();

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
    ...pipeline(),
    autoRestart,
    busy,
    relayTopic: readEnv('RELAY_TOPIC'),
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
  if (req.method === 'GET' && url.pathname === '/favicon.ico' && fs.existsSync(path.join(__dirname, 'spdi.ico'))) {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    return fs.createReadStream(path.join(__dirname, 'spdi.ico')).pipe(res);
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot());
  if (req.method === 'GET' && url.pathname === '/api/sketch') {
    // the Wokwi sketch with this computer's RELAY_TOPIC filled in, ready to paste
    try {
      const topic = readEnv('RELAY_TOPIC');
      let code = fs.readFileSync(path.join(ROOT, 'esp32', 'wokwi', 'sketch.ino'), 'utf8');
      if (topic) code = code.replace(/#define TOPIC_BASE\s+"[^"]*"/, `#define TOPIC_BASE   "${topic}"`);
      return json(res, 200, { ok: true, code, topic });
    } catch (err) {
      return json(res, 200, { ok: false, error: err.message });
    }
  }
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
    const [, kind, a, b] = url.pathname.split('/'); // /api/<a>/<b>
    if (kind !== 'api') return json(res, 404, { ok: false });
    if (a === 'start' && b) return json(res, 200, startService(b));
    if (a === 'stop' && b) return json(res, 200, stopService(b));
    if (a === 'preset' && b) return json(res, 200, await startPreset(b));
    if (a === 'fresh' && b) {
      if (body.confirm !== true) return json(res, 200, { ok: false, error: 'not confirmed' });
      freshDemo(b); // runs in the background, progress goes to the "fresh" log
      return json(res, 200, { ok: true, log: 'tool:fresh' });
    }
    if (a === 'stopall') return json(res, 200, stopAll());
    if (a === 'cira' && b === 'open') return json(res, 200, await openCira());
    if (a === 'autorestart') {
      autoRestart = !!body.on;
      broadcast('autorestart', { on: autoRestart });
      return json(res, 200, { ok: true, on: autoRestart });
    }
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
    console.log(`Control Center already runs on http://localhost:${PORT} -> opening it`);
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
  console.log('\nStopping everything ...');
  stopAll();
  if (localClient) localClient.end(true);
  if (publicClient) publicClient.end(true);
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown); // terminal window closed (Windows)
