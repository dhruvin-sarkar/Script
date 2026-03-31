'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';

function HomeAuthCtas() {
  return (
    <div className="flex items-center gap-4">
      <SignUpButton mode="modal">
        <Button className="h-auto rounded-[var(--radius-md)] bg-[var(--accent)] px-8 py-3 text-base font-medium text-white hover:bg-[var(--accent-hover)]">
          Get Started
        </Button>
      </SignUpButton>

      <SignInButton mode="modal">
        <Button
          variant="outline"
          className="h-auto rounded-[var(--radius-md)] border-[var(--border-strong)] bg-transparent px-8 py-3 text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          Sign In
        </Button>
      </SignInButton>
    </div>
  );
}

export { HomeAuthCtas };
