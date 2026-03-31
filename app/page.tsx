import { HomeAuthCtas } from '@/components/shared/HomeAuthCtas';

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

      <HomeAuthCtas />

      <p className="mt-24 text-sm text-[var(--text-muted)]">Built by developers, for developers.</p>
    </div>
  );
}
