'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthModal } from './AuthModal';
import { useAuth } from './AuthProvider';

export function Header() {
  const { user, signOut, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 h-12 flex items-center gap-4">
        <div className="flex-1" />
        <Link
          href="/"
          className="font-mono text-xs font-bold tracking-[0.2em] text-text-primary hover:text-accent transition-colors whitespace-nowrap"
        >
          MARKET TERMINAL
        </Link>

        <div className="flex-1 flex items-center justify-end gap-3">
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-text-muted text-xs font-mono hidden sm:block truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-text-muted hover:text-text-primary text-xs font-mono uppercase tracking-wider border border-border px-2 py-1 rounded hover:border-border transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-xs font-mono uppercase tracking-wider border border-accent text-accent px-2 py-1 rounded hover:bg-accent hover:text-white transition-colors"
                >
                  Sign In
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
