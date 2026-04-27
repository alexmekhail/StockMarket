'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Watchlist', href: '/watchlist' },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-bg-secondary">
      <div className="max-w-screen-xl mx-auto px-4 flex justify-center">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-5 py-3 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                active
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
