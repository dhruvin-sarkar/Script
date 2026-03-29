'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { formatDistanceToNow } from 'date-fns';
import { Clock3, Eye, Hash, Layers3, MessageSquare, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/app/providers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { TagFollowButton } from '@/components/shared/TagFollowButton';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type TagSummary = RouterOutputs['tag']['getBySlug'];
type DiscoverPost = RouterOutputs['post']['getDiscover']['items'][number];

const POST_META = {
  DEVLOG: { icon: Layers3, label: 'Devlog' },
  ARTICLE: { icon: Newspaper, label: 'Article' },
  QUESTION: { icon: MessageSquare, label: 'Question' },
  ANSWER: { icon: MessageSquare, label: 'Answer' },
  DISCUSSION: { icon: MessageSquare, label: 'Discussion' },
  SHOWCASE: { icon: MessageSquare, label: 'Showcase' },
} as const;

function getPostHref(post: DiscoverPost): string {
  switch (post.type) {
    case 'DEVLOG':
      return `/devlog/${post.id}`;
    case 'ARTICLE':
      return `/blog/${post.author.username}/${post.slug ?? post.id}`;
    case 'QUESTION':
    case 'DISCUSSION':
    case 'SHOWCASE':
      return `/forum/${post.id}`;
    default:
      return `/tags`;
  }
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createExcerpt(post: DiscoverPost): string {
  if (post.excerpt?.trim()) {
    return post.excerpt.trim();
  }

  const plainText = stripMarkdown(post.content ?? '');
  return plainText.length > 180 ? `${plainText.slice(0, 177).trimEnd()}...` : plainText;
}

function TagPostCard({ post }: { post: DiscoverPost }) {
  const postMeta = POST_META[post.type];
  const PostIcon = postMeta.icon;

  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 border border-[var(--border)]">
            <AvatarImage src={post.author.avatar ?? undefined} alt={post.author.username} />
            <AvatarFallback>{post.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {post.author.displayName ?? post.author.username}
              </p>
              <span className="text-xs text-[var(--text-muted)]">@{post.author.username}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <PostIcon className="h-3.5 w-3.5" />
                {postMeta.label}
              </span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.type === 'ARTICLE' ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {post.readingTime ?? 1} min read
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {post.type === 'QUESTION' && post.solved ? (
          <span className="rounded-full bg-[color:rgba(34,197,94,0.14)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
            Solved
          </span>
        ) : null}
      </div>

      <Link href={getPostHref(post)} className="mt-5 block">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
          {post.title ?? 'Untitled post'}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{createExcerpt(post)}</p>
      </Link>

      {post.tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 5).map((tag) => (
            <Link
              key={tag.tag.slug}
              href={`/tags/${tag.tag.slug}`}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              #{tag.tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {post.viewCount} views
        </span>
        <span>{post.privacy.toLowerCase()}</span>
      </div>
    </article>
  );
}

function TagPostCardSkeleton() {
  return <Skeleton className="h-[250px] rounded-[28px]" />;
}

export function TagDetailClient({ initialTag, slug }: { initialTag: TagSummary; slug: string }) {
  const tagQuery = api.tag.getBySlug.useQuery(
    { slug },
    {
      initialData: initialTag,
    },
  );

  const postsQuery = api.post.getDiscover.useInfiniteQuery(
    {
      limit: 12,
      tag: slug,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(15,217,144,0.14),rgba(15,217,144,0.02))]">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.24em] text-[var(--accent)] uppercase">
              <Hash className="h-4 w-4" />
              Tag detail
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
              #{tagQuery.data.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
              {tagQuery.data.description ??
                `Public devlogs, articles, and forum posts tagged with ${tagQuery.data.name}.`}
            </p>
          </div>

          <div className="space-y-3 rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)]/80 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Posts</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {tagQuery.data.postCount}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">Followers</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {tagQuery.data.followerCount}
                </p>
              </div>
            </div>
            <TagFollowButton slug={tagQuery.data.slug} isFollowing={tagQuery.data.isFollowing} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Public content in #{tagQuery.data.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Mixed chronologically across devlogs, articles, and forum threads.
          </p>
        </div>

        {postsQuery.isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <TagPostCardSkeleton key={index} />
            ))}
          </div>
        ) : postsQuery.isError ? (
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              We couldn&apos;t load posts for this tag
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {postsQuery.error.message}
            </p>
          </div>
        ) : posts.length ? (
          <>
            <div className="space-y-5">
              {posts.map((post) => (
                <TagPostCard key={post.id} post={post} />
              ))}
            </div>

            {postsQuery.hasNextPage ? (
              <div className="text-center">
                <Button
                  variant="outline"
                  disabled={postsQuery.isFetchingNextPage}
                  onClick={() => void postsQuery.fetchNextPage()}
                >
                  {postsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Hash className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              No public posts in #{tagQuery.data.name} yet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--text-secondary)]">
              Follow the tag to get updates as soon as the community starts posting about it.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
