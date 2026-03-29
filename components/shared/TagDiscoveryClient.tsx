'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { keepPreviousData } from '@tanstack/react-query';
import { useDeferredValue, useState, useTransition } from 'react';
import Link from 'next/link';
import { Hash, Search, Sparkles } from 'lucide-react';
import { api } from '@/app/providers';
import { TagFollowButton } from '@/components/shared/TagFollowButton';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type TagListItem = RouterOutputs['tag']['list']['items'][number];

function TagCard({ tag }: { tag: TagListItem }) {
  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            <Hash className="h-3.5 w-3.5" />
            Topic
          </div>
          <Link href={`/tags/${tag.slug}`} className="mt-3 block">
            <h2 className="truncate text-xl font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
              #{tag.name}
            </h2>
          </Link>
        </div>

        <TagFollowButton slug={tag.slug} isFollowing={tag.isFollowing} className="shrink-0" />
      </div>

      <p className="mt-3 min-h-[56px] text-sm leading-7 text-[var(--text-secondary)]">
        {tag.description ?? `See what the Script community is sharing about ${tag.name}.`}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">Posts</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{tag.postCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">Followers</p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {tag.followerCount}
          </p>
        </div>
      </div>
    </article>
  );
}

function TagCardSkeleton() {
  return <Skeleton className="h-[220px] rounded-[28px]" />;
}

export function TagDiscoveryClient() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);
  const trimmedQuery = deferredSearch.trim();
  const isSearching = trimmedQuery.length > 0;

  const listQuery = api.tag.list.useQuery(
    {
      page,
      limit: 18,
    },
    {
      enabled: !isSearching,
      placeholderData: keepPreviousData,
    },
  );

  const searchQuery = api.tag.search.useQuery(
    {
      q: trimmedQuery,
      limit: 24,
    },
    {
      enabled: isSearching,
    },
  );

  const items = isSearching ? (searchQuery.data ?? []) : (listQuery.data?.items ?? []);
  const isLoading = isSearching ? searchQuery.isLoading : listQuery.isLoading;
  const isError = isSearching ? searchQuery.isError : listQuery.isError;
  const errorMessage = isSearching ? searchQuery.error?.message : listQuery.error?.message;
  const isRefreshing = !isSearching && (listQuery.isFetching || isPending);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,217,144,0.14),rgba(15,217,144,0.02))]">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_320px] md:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-[var(--accent)] uppercase">
              Tags & Discovery
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
              Find the technologies shaping the community
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
              Browse the most active topics on Script, follow the ones that matter to you, and use
              them to sharpen your feed.
            </p>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)]/80 p-5">
            <label
              htmlFor="tag-search"
              className="text-xs font-semibold tracking-[0.18em] text-[var(--text-muted)] uppercase"
            >
              Search tags
            </label>
            <div className="relative mt-3">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                id="tag-search"
                value={search}
                placeholder="Search tags or tools..."
                className="h-11 rounded-full border-[var(--border)] bg-[var(--bg-base)] pl-10"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
              Search is instant and works across tag names and slugs.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {isSearching ? `Results for "${trimmedQuery}"` : 'Popular tags'}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isSearching
                ? 'Refine your search to zero in on a topic.'
                : 'Sorted by public activity across devlogs, articles, and forum threads.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            {items.length} visible
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <TagCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              We couldn&apos;t load tags right now
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{errorMessage}</p>
          </div>
        ) : items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((tag) => (
              <TagCard key={tag.id} tag={tag} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Hash className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              No tags matched that search
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--text-secondary)]">
              Try a broader term like &quot;typescript&quot;, &quot;react&quot;, or
              &quot;postgres&quot;.
            </p>
          </div>
        )}

        {!isSearching && items.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {isRefreshing
                ? `Updating page ${page}...`
                : `Page ${page}${listQuery.data?.hasMore ? ' with more tags ready.' : ' shows everything so far.'}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 1 || isRefreshing}
                onClick={() =>
                  startTransition(() => {
                    setPage((current) => Math.max(1, current - 1));
                  })
                }
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!listQuery.data?.hasMore || isRefreshing || listQuery.isPlaceholderData}
                onClick={() =>
                  startTransition(() => {
                    setPage((current) => current + 1);
                  })
                }
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
