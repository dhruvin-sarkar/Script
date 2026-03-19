'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ThreadRowProps {
  id: string;
  title: string;
  type: 'QUESTION' | 'DISCUSSION' | 'SHOWCASE';
  solved: boolean;
  createdAt: Date;
  viewCount: number;
  devlogId: string | null;
  author: { username: string; displayName: string | null; avatar: string | null };
  tags: { name: string; slug: string }[];
  _count: { votes: number; answers: number };
}

function getTypeLabel(type: ThreadRowProps['type']): string {
  switch (type) {
    case 'QUESTION':
      return 'Q';
    case 'DISCUSSION':
      return 'Discussion';
    case 'SHOWCASE':
      return 'Showcase';
  }
}

export function ThreadRow(props: ThreadRowProps) {
  return (
    <Link
      href={`/forum/${props.id}`}
      className="grid grid-cols-[80px_minmax(0,1fr)_100px] gap-4 border-b border-[var(--border)] px-1 py-4 transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
    >
      <div className="text-center">
        <p
          className={cn(
            'text-lg font-semibold text-[var(--text-secondary)]',
            props.solved ? 'text-[var(--success)]' : '',
          )}
        >
          {props._count.votes}
        </p>
        <div
          className={cn(
            'mt-2 rounded-full px-2 py-1 text-xs font-medium',
            props.solved
              ? 'bg-[var(--success)] text-white'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
          )}
        >
          {props._count.answers} answers
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
            {getTypeLabel(props.type)}
          </span>
          {props.solved ? (
            <span className="rounded-full bg-[color:rgba(34,197,94,0.14)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
              ✓ Solved
            </span>
          ) : null}
          {props.devlogId ? (
            <span className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
              Linked Devlog
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
          {props.title}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {props.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.slug}
              className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-secondary)]"
            >
              #{tag.name}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>
            asked {formatDistanceToNow(new Date(props.createdAt), { addSuffix: true })} by
          </span>
          <Avatar className="h-5 w-5">
            <AvatarImage src={props.author.avatar ?? undefined} alt={props.author.username} />
            <AvatarFallback>{props.author.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-[var(--text-secondary)]">@{props.author.username}</span>
        </div>
      </div>

      <div className="text-right text-xs text-[var(--text-muted)]">{props.viewCount} views</div>
    </Link>
  );
}

export function ThreadRowSkeleton() {
  return (
    <div className="h-28 animate-pulse border-b border-[var(--border)] bg-[var(--bg-surface)]/50" />
  );
}
