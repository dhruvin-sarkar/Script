'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Home, BookOpen, MessageSquare, Hash, User, TrendingUp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Feed', icon: Home, href: '/feed' },
  { label: 'Devlogs', icon: BookOpen, href: '/devlogs' },
  { label: 'Forum', icon: MessageSquare, href: '/forum' },
  { label: 'Articles', icon: Layers, href: '/blog' },
  { label: 'Tags', icon: Hash, href: '/tags' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const profileLink = user?.username ? `/@${user.username}` : null;

  return (
    <aside className="sticky top-[56px] hidden h-[calc(100vh-56px)] w-[220px] flex-col gap-8 px-4 py-6 lg:flex">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 font-medium text-[var(--text-sm)] transition-all',
                isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {profileLink && (
          <Link
            href={profileLink}
            className={cn(
              'group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 font-medium text-[var(--text-sm)] transition-all',
              pathname === profileLink
                ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
            )}
          >
            <User
              className={cn(
                'h-5 w-5 transition-colors',
                pathname === profileLink
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
              )}
            />
            Profile
          </Link>
        )}
      </nav>

      <div className="flex flex-col gap-4">
        <h3 className="px-3 font-bold tracking-wider text-[var(--text-muted)] text-[var(--text-xs)] uppercase">
          My Tags
        </h3>
        <div className="flex flex-col gap-1">
          {['typescript', 'nextjs', 'rust'].map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-[var(--text-secondary)] text-[var(--text-sm)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              # {tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
