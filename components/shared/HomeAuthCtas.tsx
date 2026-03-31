'use client';

import Link from 'next/link';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type HomeAuthCtasProps = {
  isSignedIn: boolean;
};

const primaryCtaClassName = cn(
  buttonVariants({
    className:
      'h-auto rounded-[var(--radius-md)] bg-[var(--accent)] px-8 py-3 text-base font-medium text-white hover:bg-[var(--accent-hover)]',
  }),
);

const secondaryCtaClassName = cn(
  buttonVariants({
    variant: 'outline',
    className:
      'h-auto rounded-[var(--radius-md)] border-[var(--border-strong)] bg-transparent px-8 py-3 text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
  }),
);

function HomeAuthCtas({ isSignedIn }: HomeAuthCtasProps) {
  return (
    <div className="flex items-center gap-4">
      {isSignedIn ? (
        <>
          <Link className={primaryCtaClassName} href="/feed">
            Open Feed
          </Link>

          <Link className={secondaryCtaClassName} href="/forum">
            Browse Forum
          </Link>
        </>
      ) : (
        <>
          <SignUpButton mode="modal">
            <button className={primaryCtaClassName} type="button">
              Get Started
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button className={secondaryCtaClassName} type="button">
              Sign In
            </button>
          </SignInButton>
        </>
      )}
    </div>
  );
}

export { HomeAuthCtas };
