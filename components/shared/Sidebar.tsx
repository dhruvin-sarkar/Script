'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  BookOpen, 
  MessageSquare, 
  Hash, 
  User, 
  TrendingUp, 
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Feed', icon: Home, href: '/feed' },
  { label: 'Devlogs', icon: BookOpen, href: '/devlogs' },
  { label: 'Forum', icon: MessageSquare, href: '/forum' },
  { label: 'Blog', icon: Layers, href: '/articles' },
  { label: 'Tags', icon: Hash, href: '/tags' },
  { label: 'Profile', icon: User, href: '/@jsmith' }, // Placeholder username
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[220px] flex-col sticky top-[56px] h-[calc(100vh-56px)] py-6 px-4 gap-8">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium transition-all group",
                isActive 
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                )} 
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4">
        <h3 className="px-3 text-[var(--text-xs)] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          My Tags
        </h3>
        <div className="flex flex-col gap-1">
          {['typescript', 'nextjs', 'rust'].map((tag) => (
            <Link 
              key={tag} 
              href={`/tags/${tag}`}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              # {tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
