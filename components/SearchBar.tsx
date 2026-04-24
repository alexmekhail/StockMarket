'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [value, setValue] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return;
    router.push(`/stock/${ticker}`);
    setValue('');
    inputRef.current?.blur();
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <span className="absolute left-3 text-text-muted text-sm select-none">$</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="SEARCH TICKER"
        maxLength={10}
        className="
          bg-bg-tertiary border border-border text-text-primary
          font-mono text-sm placeholder:text-text-muted
          pl-7 pr-3 py-1.5 rounded w-36 focus:w-48 transition-all duration-200
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
          uppercase tracking-widest
        "
      />
    </form>
  );
}
