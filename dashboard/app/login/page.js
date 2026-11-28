'use client';

import { useState } from 'react';

/** Only same-site paths are allowed after login (no open redirect). */
function safeNext() {
  const n = new URLSearchParams(window.location.search).get('next') || '/';
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/';
}

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      window.location.assign(safeNext());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4">
      <form onSubmit={submit} className="w-full space-y-4 rounded-lg border border-edge bg-panel p-6">
        <div>
          <h1 className="text-xl font-bold text-slate-50">SPDI · Live dashboard</h1>
          <p className="text-sm text-muted">Enter the dashboard password to see the inspection data.</p>
        </div>
        <label className="block text-sm text-slate-300">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-edge bg-slate-900 px-3 py-2 text-slate-100"
            required
            maxLength={256}
            autoFocus
          />
        </label>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded bg-sky-700 px-3 py-2 font-semibold text-white hover:bg-sky-600 disabled:opacity-60">
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}
