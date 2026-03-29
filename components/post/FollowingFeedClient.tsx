'use client';

import { keepPreviousData } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Compass, Layers3, Users2 } from 'lucide-react';
import { api } from '@/app/providers';
import {
  FeedCardSkeleton,
  FeedMilestoneCard,
  FeedPostCard,
  type FollowingFeedItem,
} from '@/components/post/FeedCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FeedFilter = 'all' | 'questions' | 'devlogs' | 'articles' | 'milestones';

const FILTERS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'questions', label: 'Questions' },
  { value: 'devlogs', label: 'Devlogs' },
  { value: 'articles', label: 'Articles' },
  { value: 'milestones', label: 'Milestones' },
];

function FeedEmptyState({
  followingUsersCount,
  followingTagsCount,
}: {
  followingUsersCount: number;
  followingTagsCount: number;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
        <Compass className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
        Follow people and tags to fill your feed
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
        Your following feed is chronological and intentionally simple. Right now you&apos;re
        following {followingUsersCount} people and {followingTagsCount} tags with nothing matching
        this filter yet.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/tags">
          <Button>Browse tags</Button>
        </Link>
        <Link href="/forum">
          <Button variant="outline">Explore community</Button>
        </Link>
      </div>
    </div>
  );
}

function FeedList({ items }: { items: FollowingFeedItem[] }) {
  return (
    <div className="space-y-5">
      {items.map((item) =>
        item.kind === 'post' ? (
          <FeedPostCard key={item.id} item={item} />
        ) : (
          <FeedMilestoneCard key={item.id} item={item} />
        ),
      )}
    </div>
  );
}

export function FollowingFeedClient() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const query = api.feed.getFollowing.useQuery(
    {
      filter,
      page,
      limit: 10,
    },
    {
      placeholderData: keepPreviousData,
    },
  );

  const items = query.data?.items ?? [];
  const isRefreshing = query.isFetching || isPending;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,217,144,0.14),rgba(15,217,144,0.02))]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.24em] text-[var(--accent)] uppercase">
                  Following Feed
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
                  Everything from the people and topics you care about
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
                  No algorithm, no ranking tricks. Just a clean chronological stream of devlogs,
                  questions, articles, and milestones from your follows.
                </p>
              </div>

              <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[var(--text-muted)] uppercase">
                    <Users2 className="h-4 w-4" />
                    Following
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                    {query.data?.followingUsersCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">People in your orbit</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[var(--text-muted)] uppercase">
                    <Layers3 className="h-4 w-4" />
                    Tags
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                    {query.data?.followingTagsCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Topics you track</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={filter} className="space-y-6">
          <TabsList
            variant="line"
            className="w-full flex-wrap justify-start gap-2 border-b border-[var(--border)] p-0 pb-2"
          >
            {FILTERS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="rounded-full px-4 py-2 text-sm font-medium data-active:bg-[var(--accent-dim)] data-active:text-[var(--accent)] data-active:after:hidden"
                onClick={() =>
                  startTransition(() => {
                    setFilter(item.value);
                    setPage(1);
                  })
                }
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={filter} className="space-y-6">
            {query.isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <FeedCardSkeleton key={index} />
                ))}
              </div>
            ) : query.isError ? (
              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  We couldn&apos;t load your following feed
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {query.error.message}
                </p>
              </div>
            ) : items.length ? (
              <>
                <FeedList items={items} />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isRefreshing
                      ? `Updating page ${page}...`
                      : `Page ${page}${query.data?.hasMore ? ' with more updates ready.' : ' is the latest page.'}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1 || isRefreshing}
                      onClick={() =>
                        startTransition(() => {
                          setPage((current) => Math.max(1, current - 1));
                        })
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={!query.data?.hasMore || isRefreshing || query.isPlaceholderData}
                      onClick={() =>
                        startTransition(() => {
                          setPage((current) => current + 1);
                        })
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <FeedEmptyState
                followingUsersCount={query.data?.followingUsersCount ?? 0}
                followingTagsCount={query.data?.followingTagsCount ?? 0}
              />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <aside className="hidden space-y-4 xl:block">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-muted)] uppercase">
            How this works
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            <li>Chronological only, with no algorithmic ranking.</li>
            <li>Posts appear when they come from followed people or followed tags.</li>
            <li>Milestones surface badge unlocks from people you follow.</li>
          </ul>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--text-muted)] uppercase">
            Quick actions
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/tags">
              <Button variant="outline" className="w-full justify-start">
                Discover tags
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline" className="w-full justify-start">
                Read articles
              </Button>
            </Link>
            <Link href="/forum">
              <Button variant="outline" className="w-full justify-start">
                Browse questions
              </Button>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
