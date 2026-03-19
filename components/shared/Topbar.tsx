'use client';

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import { ChevronDown, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';

export function Topbar() {
  const { isSignedIn } = useAuth();
  const [writeMenuOpen, setWriteMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-[56px] border-b border-[var(--border)] bg-[var(--bg-base)]/80 backdrop-blur-md">
      <div className="container-max mx-auto flex h-full items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="font-mono text-2xl font-black tracking-tighter text-[var(--accent)] transition-transform group-hover:scale-110">
            {'</>'}
          </span>
        </Link>

        <div className="mx-12 hidden max-w-md flex-1 items-center md:flex">
          <div className="group relative w-full">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              readOnly
              placeholder="Search posts, tags, users..."
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-base)] pr-12 pl-10 text-[var(--text-primary)] text-[var(--text-sm)] transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] focus:outline-none"
              onFocus={() => setCommandOpen(true)}
              onClick={() => setCommandOpen(true)}
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] uppercase italic">
              Ctrl K
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <>
              <NotificationBell />

              <div className="relative hidden sm:block">
                <button
                  type="button"
                  className="shadow-accent/20 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 font-bold text-[var(--text-sm)] text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] active:scale-95"
                  onClick={() => setWriteMenuOpen((current) => !current)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Write</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {writeMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-xl">
                    <Link
                      href="/devlog/new"
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                      onClick={() => setWriteMenuOpen(false)}
                    >
                      New Devlog
                    </Link>
                    <Link
                      href="/blog/new"
                      className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                      onClick={() => setWriteMenuOpen(false)}
                    >
                      New Article
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="mx-1 h-4 w-[1px] bg-[var(--border)]" />

              <div className="flex items-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        'h-9 w-9 border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all',
                    },
                  }}
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  );
}
