'use client';

const KIND = {
  frame: 'text-sky-300',
  pass: 'text-green-300',
  reject: 'text-red-300',
  sync: 'text-emerald-300',
  offline: 'text-amber-300',
  info: 'text-slate-300',
};

const time = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour12: false });

/** Live MQTT messages as they would appear on the broker. */
export default function MessageFeed({ messages }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-edge bg-panel">
      <div className="border-b border-edge px-4 py-3 text-base font-semibold text-slate-200">
        ข้อความ MQTT <span className="text-sm font-normal text-muted">· spdi/#</span>
      </div>
      <div className="max-h-[420px] flex-1 space-y-2 overflow-auto p-3 font-mono text-[11px] leading-snug">
        {messages.length === 0 ? <div className="text-muted">รอข้อความ…</div> : null}
        {messages.map((m) => (
          <div key={m.id} className="rounded border border-edge/70 bg-black/20 p-2">
            <div className="flex justify-between gap-2">
              <span className={`font-semibold ${KIND[m.kind] || KIND.info}`}>{m.topic}</span>
              <span className="text-muted">{time(m.at)}</span>
            </div>
            <div className="mt-1 break-all text-slate-400">{JSON.stringify(m.payload)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
