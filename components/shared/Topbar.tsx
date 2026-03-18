'use client';

import Link from 'next/link';
import { Search, Bell, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 h-[56px] border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md">
      <div className="container-max mx-auto flex h-full items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold text-[var(--accent)] tracking-tighter">{"</>"}</span>
          {/* <span className="font-display text-xl font-bold text-[var(--text-primary)]">Script</span> */}
        </Link>

        {/* Center: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md items-center mx-12">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="text"
              placeholder="Search posts, tags, users... (cmd+k)"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] pl-10 pr-12 text-[var(--text-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-dim)] transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] uppercase">
              ⌘ K
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--error)] border-2 border-[var(--bg-base)]" />
          </button>
          
          <Link 
            href="/devlog/new" 
            className="hidden sm:flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-[var(--text-sm)] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Write</span>
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />

          <button className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)] transition-colors">
            <User className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
    </header>
  );
}
