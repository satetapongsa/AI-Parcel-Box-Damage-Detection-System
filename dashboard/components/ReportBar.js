'use client';

import { useEffect, useState } from 'react';

/** Line selector and CSV report download for the Live page. */
export default function ReportBar({ line, onLine }) {
  const [lines, setLines] = useState(['line1']);
  const [days, setDays] = useState(7);
  const [session, setSession] = useState({ enabled: false, loggedIn: false });

  useEffect(() => {
    let stop = false;
    fetch('/api/lines', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!stop && Array.isArray(d.lines) && d.lines.length) setLines(d.lines);
      })
      .catch(() => {});
    fetch('/api/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!stop) setSession(d);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);

  const href = `/api/export?days=${days}&line=${encodeURIComponent(line)}`;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel px-4 py-2 text-sm">
      <label className="flex items-center gap-2 text-muted">
        Line
        <select
          value={line}
          onChange={(e) => onLine(e.target.value)}
          className="rounded border border-edge bg-slate-900 px-2 py-1 text-slate-100"
        >
          {lines.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <span className="mx-1 h-5 w-px bg-edge" aria-hidden />
      <label className="flex items-center gap-2 text-muted">
        Report
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border border-edge bg-slate-900 px-2 py-1 text-slate-100"
        >
          <option value={1}>today (24 h)</option>
          <option value={7}>last 7 days</option>
          <option value={30}>last 30 days</option>
          <option value={90}>last 90 days</option>
        </select>
      </label>
      <a href={href} className="rounded bg-sky-700 px-3 py-1 font-semibold text-white hover:bg-sky-600" download>
        Download CSV
      </a>
      {session.enabled && session.loggedIn ? (
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/logout', { method: 'POST' }).catch(() => {});
            window.location.assign('/login');
          }}
          className="ml-auto rounded border border-edge px-3 py-1 text-slate-300 hover:bg-slate-800"
        >
          Log out
        </button>
      ) : null}
    </div>
  );
}
