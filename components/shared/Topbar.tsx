'use client';

import Link from 'next/link';
import { Search, Bell, Plus } from 'lucide-react';
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 h-[56px] border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md">
      <div className="container-max mx-auto flex h-full items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-mono text-2xl font-black tracking-tighter text-[var(--accent)] transition-transform group-hover:scale-110">
            {'</>'}
          </span>
        </Link>

        {/* Center: Search Bar */}
        <div className="mx-12 hidden max-w-md flex-1 items-center md:flex">
          <div className="group relative w-full">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              type="text"
              placeholder="Search posts, tags, users..."
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] pr-12 pl-10 text-[var(--text-primary)] text-[var(--text-sm)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] focus:outline-none"
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] uppercase italic">
              ⌘ K
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <SignedIn>
            <button className="group relative rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)]">
              <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-[var(--bg-base)] bg-[var(--error)]" />
            </button>

            <Link
              href="/devlog/new"
              className="shadow-accent/20 hidden items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 font-bold text-[var(--text-sm)] text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] active:scale-95 sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>Write</span>
            </Link>

            <div className="mx-1 h-4 w-[1px] bg-[var(--border)]" />

            <div className="flex items-center">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      'h-9 w-9 border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all',
                  },
                }}
              />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" className="font-bold text-[var(--text-secondary)]">
                Sign In
              </Button>
            </SignInButton>
            <Link href="/sign-up">
              <Button className="shadow-accent/20 rounded-full bg-[var(--accent)] px-6 font-bold text-white shadow-lg hover:bg-[var(--accent-hover)]">
                Join
              </Button>
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
