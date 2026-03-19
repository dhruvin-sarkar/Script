'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Clock3, Eye } from 'lucide-react';

interface BlogCardProps {
  id: string;
  username: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  readingTime: number | null;
  publishedAt: Date | null;
  viewCount: number;
  tags: { name: string; slug: string }[];
}

export function BlogCard({
  username,
  slug,
  title,
  excerpt,
  coverImage,
  readingTime,
  publishedAt,
  viewCount,
  tags,
}: BlogCardProps) {
  return (
    <Link
      href={`/blog/${username}/${slug}`}
      className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] transition-transform hover:-translate-y-0.5"
    >
      <div className="h-48 w-full bg-gradient-to-br from-[var(--accent)]/35 via-[var(--bg-overlay)] to-[var(--bg-elevated)]">
        {coverImage ? (
          <img src={coverImage} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-6 text-5xl font-black text-white/70">{'</>'}</div>
        )}
      </div>

      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag.slug}
              className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs font-medium text-[var(--accent)]"
            >
              #{tag.name}
            </span>
          ))}
        </div>

        <h3 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
          {excerpt ?? 'No excerpt yet.'}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
          <span>@{username}</span>
          {publishedAt ? (
            <span>{formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {readingTime ?? 1} min read
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {viewCount}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BlogCardSkeleton() {
  return (
    <div className="h-[380px] animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)]/60" />
  );
}
