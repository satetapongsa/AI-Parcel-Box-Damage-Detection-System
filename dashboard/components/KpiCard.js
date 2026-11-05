'use client';

const TONES = {
  neutral: 'text-slate-100',
  ok: 'text-ok',
  bad: 'text-bad',
};

/** size="lg" for the main counters, "sm" for secondary figures */
export default function KpiCard({ title, subtitle, value, unit, note, tone = 'neutral', noteTone, size = 'sm' }) {
  const big = size === 'lg';
  return (
    <div className="rounded-lg border border-edge bg-panel px-4 py-3">
      <div className={`font-semibold text-slate-300 ${big ? 'text-base' : 'text-sm'}`}>
        {title}
        {subtitle ? <span className="ml-1.5 font-normal text-muted">{subtitle}</span> : null}
      </div>
      <div
        className={`font-mono font-bold leading-tight tabular-nums ${TONES[tone]} ${
          big ? 'mt-1 text-4xl sm:text-5xl xl:text-6xl' : 'mt-1 text-2xl sm:text-3xl'
        }`}
      >
        {value}
        {unit ? <span className="ml-1 text-base font-medium text-muted">{unit}</span> : null}
      </div>
      {note ? <div className={`mt-1 text-sm ${noteTone ? TONES[noteTone] : 'text-muted'}`}>{note}</div> : null}
    </div>
  );
}
