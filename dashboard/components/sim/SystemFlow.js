'use client';

/**
 * System status chain for the digital twin.
 * Edge (always runs) → local SQLite → cloud (can go offline).
 */
function Node({ label, sub, ok, warn }) {
  const tone = !ok ? 'bg-red-500/15 text-red-300' : warn ? 'bg-amber-500/15 text-amber-300' : 'text-slate-200';
  const dot = !ok ? 'bg-bad' : warn ? 'bg-amber-400' : 'bg-ok';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${tone}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
      {sub ? <span className="text-xs text-muted">({sub})</span> : null}
    </span>
  );
}

const Arrow = () => (
  <span className="text-muted" aria-hidden="true">
    →
  </span>
);

export default function SystemFlow({ snap }) {
  const run = snap.running;
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Edge</span>
        <Node label="Camera" ok={run} />
        <Arrow />
        <Node label="CiRA CORE" sub={run ? '15 fps' : 'stop'} ok={run} />
        <Arrow />
        <Node label="MQTT" ok={run} />
        <Arrow />
        <Node label="Bridge" sub="นับครั้งเดียว" ok={run} />
        <Arrow />
        <Node label="ESP32" sub={`${snap.esp32Cmds} cmd`} ok={run} />
        <Arrow />
        <Node label="แขนปัด" ok={run} />
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Data</span>
        <Node label="Bridge" ok={run} />
        <Arrow />
        <Node label="SQLite" sub={`คิว ${snap.queue}/500`} ok warn={snap.queue > 0} />
        <Arrow />
        <Node label="Cloud DB" sub={snap.online ? `${snap.synced} synced` : 'offline'} ok={snap.online} />
        <Arrow />
        <Node label="Dashboard" ok />
      </div>
    </div>
  );
}
