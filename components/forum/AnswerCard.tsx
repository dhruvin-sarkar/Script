'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { MarkdownPreview } from '@/components/shared/MarkdownPreview';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoteButtons } from './VoteButtons';

interface AnswerCardProps {
  id: string;
  content: string;
  accepted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    reputation: number;
  };
  _count: { votes: number };
  currentUserId: string | null;
  threadAuthorId: string;
  isThreadSolved: boolean;
  userVote: 1 | -1 | null;
  onAccept: (answerId: string) => void;
  onVote: (answerId: string, value: 1 | -1) => void;
  onDelete: (answerId: string) => void;
}

export function AnswerCard({
  id,
  content,
  accepted,
  createdAt,
  updatedAt,
  user,
  _count,
  currentUserId,
  threadAuthorId,
  isThreadSolved,
  userVote,
  onAccept,
  onVote,
  onDelete,
}: AnswerCardProps) {
  const isThreadAuthor = currentUserId === threadAuthorId;
  const isAnswerAuthor = currentUserId === user.id;

  return (
    <article
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5',
        accepted ? 'border-l-[3px] border-l-[var(--success)]' : '',
      )}
    >
      {accepted ? (
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
          <CheckCircle2 className="h-4 w-4" />
          Accepted Answer
        </div>
      ) : null}

      <div className="flex gap-4">
        <div className="w-12 shrink-0">
          <VoteButtons
            score={_count.votes}
            userVote={userVote}
            onVote={(value) => onVote(id, value)}
            disabled={currentUserId === user.id}
            disabledReason="Can't vote on your own post"
          />
        </div>

        <div className="min-w-0 flex-1">
          <MarkdownPreview content={content} />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar ?? undefined} alt={user.username} />
                <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">@{user.username}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  answered {formatDistanceToNow(new Date(createdAt), { addSuffix: true })} · rep{' '}
                  {user.reputation}
                  {updatedAt.getTime() !== createdAt.getTime()
                    ? ` · updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isThreadAuthor && !isThreadSolved && !accepted ? (
                <Button size="sm" onClick={() => onAccept(id)}>
                  Accept Answer
                </Button>
              ) : null}
              {isAnswerAuthor ? (
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              ) : null}
              {isAnswerAuthor ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[var(--error)]"
                  onClick={() => onDelete(id)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AnswerCardSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/60" />
  );
}
