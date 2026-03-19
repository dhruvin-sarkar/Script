import { SignUpButton, SignInButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4">
      <div className="pointer-events-none absolute top-1/4 h-[400px] w-[600px] bg-[radial-gradient(circle,var(--accent)_0%,transparent_70%)] opacity-20 blur-[120px]" />

      <div className="relative mb-8">
        <h1 className="font-mono text-6xl font-bold text-[var(--accent)] md:text-8xl">{'</>'}</h1>
      </div>

      <h2 className="mb-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
        Script
      </h2>

      <p className="mb-12 max-w-lg text-center text-lg text-[var(--text-secondary)]">
        The developer platform for logging, learning, and connecting.
      </p>

      <div className="flex items-center gap-4">
        <SignUpButton mode="modal">
          <button className="cursor-pointer rounded-[var(--radius-md)] bg-[var(--accent)] px-8 py-3 text-base font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)]">
            Get Started
          </button>
        </SignUpButton>

        <SignInButton mode="modal">
          <button className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-transparent px-8 py-3 text-base font-medium text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)]">
            Sign In
          </button>
        </SignInButton>
      </div>

      <p className="mt-24 text-sm text-[var(--text-muted)]">Built by developers, for developers.</p>
    </div>
  );
}
