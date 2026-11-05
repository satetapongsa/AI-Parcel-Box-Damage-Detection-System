'use client';

/**
 * Compact system status chain: one dot per stage, green = working, red = problem.
 * Video → CiRA → MQTT → Bridge → MongoDB → Dashboard
 */
const NODES = [
  { key: 'video', label: 'Video' },
  { key: 'cira', label: 'CiRA' },
  { key: 'mqtt', label: 'MQTT' },
  { key: 'bridge', label: 'Bridge' },
  { key: 'db', label: 'Database' },
  { key: 'dashboard', label: 'Dashboard' },
];

export default function Pipeline({ health }) {
  const state = {
    video: health.cira,
    cira: health.cira,
    mqtt: health.mqtt,
    bridge: health.bridge,
    db: health.db,
    dashboard: true,
  };
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm" aria-label="System status">
      {NODES.map((n, i) => {
        const ok = state[n.key];
        return (
          <li key={n.key} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${
                ok ? 'text-slate-200' : 'bg-red-500/15 text-red-300'
              }`}
              title={ok ? 'OK' : 'ไม่ทำงาน / Not running'}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-ok' : 'bg-bad'}`} />
              {n.label}
              {n.key === 'cira' && health.ciraDetail ? (
                <span className="text-xs text-muted">({health.ciraDetail})</span>
              ) : null}
            </span>
            {i < NODES.length - 1 ? <span className="text-muted" aria-hidden="true">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
