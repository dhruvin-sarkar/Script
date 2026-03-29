'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { api } from '@/app/providers';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function TrendingTagsWidget({ compact = false }: { compact?: boolean }) {
  const query = api.tag.getTrending.useQuery({ limit: compact ? 5 : 6 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-3">
        <h3 className="font-bold tracking-wider text-[var(--text-muted)] text-[var(--text-xs)] uppercase">
          Trending Tags
        </h3>
        <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: compact ? 4 : 5 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : query.data?.length ? (
        <div className="flex flex-col gap-1">
          {query.data.map((tag, index) => (
            <Link
              key={tag.slug}
              href={`/tags/${tag.slug}`}
              className={cn(
                'rounded-[var(--radius-md)] border border-transparent px-3 py-3 transition-colors',
                'hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--accent)]">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      #{tag.name}
                    </span>
                  </div>
                  {tag.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {tag.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {tag.postCount} posts
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-3 text-sm leading-6 text-[var(--text-secondary)]">
          Trending tags will appear once the community starts posting.
        </p>
      )}

      <Link
        href="/tags"
        className="px-3 text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
      >
        Browse all tags
      </Link>
    </div>
  );
}
