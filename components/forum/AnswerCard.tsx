'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { Button } from '@/components/ui/button';
import { api } from '@/app/providers';
import { formatDistanceToNow } from 'date-fns';
import { ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface AnswerCardProps {
  answer: {
    id: string;
    content: string;
    createdAt: Date;
    accepted: boolean;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
    };
    votes: Array<{ userId: string; value: number }>;
  };
  isQuestionAuthor: boolean;
  questionSolved: boolean;
}

export function AnswerCard({ answer, isQuestionAuthor, questionSolved }: AnswerCardProps) {
  const { user: clerkUser } = useUser();
  const [votes, setVotes] = useState(answer.votes);

  const totalVotes = votes.reduce((acc, vote) => acc + vote.value, 0);
  // In a real app, we'd fetch the current user's local ID or compare with clerkId if stored in votes
  const userVote = 0; // Simplified for now

  const voteMutation = api.post.vote.useMutation();
  const acceptMutation = api.post.acceptAnswer.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleVote = (value: number) => {
    voteMutation.mutate({ postId: answer.id, value });
  };

  const handleAccept = () => {
    if (confirm('Accept this answer as the correct solution?')) {
      acceptMutation.mutate({ answerId: answer.id });
    }
  };

  return (
    <div
      className={cn(
        'flex gap-4 rounded-2xl border p-6 transition-all',
        answer.accepted
          ? 'bg-accent/5 border-accent ring-accent/20 shadow-sm ring-1'
          : 'bg-card border-border',
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-full', userVote === 1 && 'text-accent bg-accent/10')}
          onClick={() => handleVote(1)}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <span className="text-lg font-bold tabular-nums">{totalVotes}</span>
        <Button
          variant="ghost"
          size="icon"
          className={cn('rounded-full', userVote === -1 && 'text-destructive bg-destructive/10')}
          onClick={() => handleVote(-1)}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>

        {answer.accepted && (
          <div className="text-accent mt-2">
            <CheckCircle2 className="fill-accent/10 h-8 w-8" title="Accepted Answer" />
          </div>
        )}

        {isQuestionAuthor && !questionSolved && !answer.accepted && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-accent hover:bg-accent/10 mt-2 rounded-full"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            title="Mark as accepted"
          >
            <CheckCircle2 className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
          {answer.content}
        </div>

        <div className="border-border/50 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={answer.author.avatar || undefined} />
              <AvatarFallback>{answer.author.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-xs">
              <p className="text-primary font-bold">@{answer.author.username}</p>
              <p className="text-muted-foreground">
                answered {formatDistanceToNow(new Date(answer.createdAt))} ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
