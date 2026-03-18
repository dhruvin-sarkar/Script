import { SignUpButton, SignInButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4"
         style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Floating accent glow */}
      <div
        className="pointer-events-none absolute top-1/4 h-[400px] w-[600px] opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
      />

      {/* Logo */}
      <div className="relative mb-8">
        <h1
          className="text-6xl font-bold md:text-8xl"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
          }}
        >
          {'</>'}
        </h1>
      </div>

      {/* Brand name */}
      <h2
        className="mb-4 text-4xl font-bold tracking-tight md:text-5xl"
        style={{ color: 'var(--text-primary)' }}
      >
        Script
      </h2>

      {/* Tagline */}
      <p
        className="mb-12 max-w-lg text-center text-lg"
        style={{ color: 'var(--text-secondary)' }}
      >
        The developer platform for logging, learning, and connecting.
      </p>

      {/* CTA Buttons */}
      <div className="flex items-center gap-4">
        <SignUpButton mode="modal">
          <button
            className="cursor-pointer rounded-lg px-8 py-3 text-base font-medium text-white transition-colors duration-150"
            style={{
              backgroundColor: 'var(--accent)',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent)')
            }
          >
            Get Started
          </button>
        </SignUpButton>

        <SignInButton mode="modal">
          <button
            className="cursor-pointer rounded-lg border px-8 py-3 text-base font-medium transition-colors duration-150"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-elevated)')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = 'transparent')
            }
          >
            Sign In
          </button>
        </SignInButton>
      </div>

      {/* Footer */}
      <p
        className="mt-24 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Built by developers, for developers.
      </p>
    </div>
  );
}
