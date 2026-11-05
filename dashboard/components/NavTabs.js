'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'จำลองระบบ', sub: 'Digital twin' },
  { href: '/live', label: 'ข้อมูลจริง', sub: 'Live (CiRA + DB)' },
];

export default function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1" aria-label="Pages">
      {TABS.map((t) => {
        const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              active ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label} <span className={`text-xs font-normal ${active ? 'text-slate-600' : 'text-muted'}`}>{t.sub}</span>
          </Link>
        );
      })}
    </nav>
  );
}
