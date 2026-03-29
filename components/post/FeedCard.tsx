'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  Award,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquare,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type FollowingFeedItem = RouterOutputs['feed']['getFollowing']['items'][number];

function getPostHref(item: Extract<FollowingFeedItem, { kind: 'post' }>): string {
  switch (item.type) {
    case 'DEVLOG':
      return `/devlog/${item.id}`;
    case 'ARTICLE':
      return `/blog/${item.author.username}/${item.slug ?? item.id}`;
    case 'QUESTION':
    case 'DISCUSSION':
    case 'SHOWCASE':
      return `/forum/${item.id}`;
    default:
      return `/feed`;
  }
}

function getPostLabel(type: Extract<FollowingFeedItem, { kind: 'post' }>['type']): {
  icon: typeof BookOpenText;
  label: string;
} {
  switch (type) {
    case 'DEVLOG':
      return { icon: BookOpenText, label: 'Devlog' };
    case 'ARTICLE':
      return { icon: Newspaper, label: 'Article' };
    case 'QUESTION':
      return { icon: MessageSquare, label: 'Question' };
    case 'DISCUSSION':
      return { icon: MessageSquare, label: 'Discussion' };
    case 'SHOWCASE':
      return { icon: Sparkles, label: 'Showcase' };
    default:
      return { icon: BookOpenText, label: 'Post' };
  }
}

function getEngagementLabel(item: Extract<FollowingFeedItem, { kind: 'post' }>): string {
  if (item.type === 'QUESTION' || item.type === 'DISCUSSION' || item.type === 'SHOWCASE') {
    const answerLabel = item.counts.answers === 1 ? 'answer' : 'answers';
    return `${item.counts.answers} ${answerLabel}`;
  }

  const commentLabel = item.counts.comments === 1 ? 'comment' : 'comments';
  return `${item.counts.comments} ${commentLabel}`;
}

function getBadgeInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function FeedPostCard({ item }: { item: Extract<FollowingFeedItem, { kind: 'post' }> }) {
  const postMeta = getPostLabel(item.type);
  const PostIcon = postMeta.icon;

  return (
    <Link
      href={getPostHref(item)}
      className="group block overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,217,144,0.08),rgba(15,217,144,0))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 border border-[var(--border)]">
              <AvatarImage src={item.author.avatar ?? undefined} alt={item.author.username} />
              <AvatarFallback>{item.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {item.author.displayName ?? item.author.username}
                </p>
                <span className="text-xs text-[var(--text-muted)]">@{item.author.username}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <PostIcon className="h-3.5 w-3.5" />
                  {postMeta.label}
                </span>
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                {item.type === 'ARTICLE' ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.readingTime ?? 1} min read
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {item.solved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgba(34,197,94,0.14)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Solved
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
              {item.title ?? 'Untitled post'}
            </h2>
            <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              {item.excerpt || 'No summary yet.'}
            </p>
          </div>
          <ArrowUpRight className="mt-1 hidden h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 md:block" />
        </div>

        {item.tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag.slug}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
          <span>{item.counts.votes} votes</span>
          <span>{getEngagementLabel(item)}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {item.viewCount} views
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeedMilestoneCard({
  item,
}: {
  item: Extract<FollowingFeedItem, { kind: 'milestone' }>;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="bg-[linear-gradient(135deg,rgba(15,217,144,0.14),rgba(15,217,144,0.03))] p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)]">
            {item.badge.icon ? (
              <span className="text-2xl" aria-hidden="true">
                {item.badge.icon}
              </span>
            ) : (
              <Award className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
              <span>Milestone</span>
              <span className="text-[var(--text-muted)]">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
              {(item.user.displayName ?? item.user.username) || 'A developer'} unlocked{' '}
              {item.badge.name}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {item.badge.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-[var(--border)]">
            <AvatarImage src={item.user.avatar ?? undefined} alt={item.user.username ?? 'User'} />
            <AvatarFallback>{getBadgeInitials(item.badge.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              @{item.user.username}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Badge earned</p>
          </div>
        </div>

        {item.user.username ? (
          <Link
            href={`/@${item.user.username}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]',
            )}
          >
            View profile
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="h-[280px] animate-pulse rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)]/60" />
  );
}
