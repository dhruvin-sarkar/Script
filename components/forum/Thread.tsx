'use client';

import { useUser } from '@clerk/nextjs';
import { api } from '@/app/providers';
import { AnswerCard } from './AnswerCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreadProps {
  question: {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
    solved: boolean;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
    };
    tags: Array<{ tag: { name: string; slug: string } }>;
    votes: Array<{ userId: string; value: number }>;
    _count: { replies: number };
  };
  answers: Array<{
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
  }>;
}

export function Thread({ question, answers }: ThreadProps) {
  const { user: clerkUser } = useUser();
  const [answerContent, setAnswerContent] = useState('');
  const [votes, setVotes] = useState(question.votes);

  const totalVotes = votes.reduce((acc, v) => acc + v.value, 0);
  const userVote = votes.find((v) => v.userId === clerkUser?.id)?.value || 0;

  const createAnswerMutation = api.post.create.useMutation({
    onSuccess: () => {
      setAnswerContent('');
      window.location.reload();
    },
  });

  const handleSubmitAnswer = () => {
    if (!answerContent.trim()) return;
    createAnswerMutation.mutate({
      type: 'ANSWER',
      content: answerContent,
      parentId: question.id,
      privacy: 'PUBLIC',
    });
  };

  const isQuestionAuthor = clerkUser?.id === question.author.id; // Corrected: clerkUser?.id is actually clerkId, whereas author.id is local DB ID

  // We need to fetch the local user ID to check if they are the author
  const { data: currentUser } = api.user.getProfile.useQuery(
    { username: clerkUser?.username || '' },
    { enabled: !!clerkUser?.username },
  );

  const localIsAuthor = currentUser?.id === question.author.id;

  return (
    <div className="space-y-12">
      {/* Question Header */}
      <div className="bg-card border-border flex gap-6 rounded-3xl border p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn('rounded-full', userVote === 1 && 'text-accent bg-accent/10')}
          >
            <ChevronUp className="h-8 w-8" />
          </Button>
          <span className="text-2xl font-black">{totalVotes}</span>
          <Button
            variant="ghost"
            size="icon"
            className={cn('rounded-full', userVote === -1 && 'text-destructive bg-destructive/10')}
          >
            <ChevronDown className="h-8 w-8" />
          </Button>
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl leading-tight font-black tracking-tight">{question.title}</h1>
            <div className="flex flex-wrap gap-2">
              {question.tags.map((t) => (
                <span
                  key={t.tag.slug}
                  className="bg-accent/10 text-accent decoration-accent/30 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase underline underline-offset-2"
                >
                  #{t.tag.name}
                </span>
              ))}
            </div>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none leading-relaxed">
            {question.content}
          </div>

          <div className="border-border/50 flex items-center justify-between border-t pt-6">
            <div className="flex items-center gap-3">
              <Avatar className="border-accent h-10 w-10 border-2">
                <AvatarImage src={question.author.avatar || undefined} />
                <AvatarFallback>{question.author.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-accent font-bold">@{question.author.username}</p>
                <p className="text-muted-foreground text-xs italic">
                  asked {formatDistanceToNow(new Date(question.createdAt))} ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="space-y-8">
        <div className="mb-6 flex items-center gap-3 px-2">
          <MessageSquare className="text-accent h-6 w-6" />
          <h2 className="text-2xl font-black tracking-tight uppercase">{answers.length} Answers</h2>
        </div>

        <div className="space-y-6">
          {answers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              isQuestionAuthor={localIsAuthor}
              questionSolved={question.solved}
            />
          ))}
        </div>
      </div>

      {/* Write Answer */}
      {clerkUser && (
        <div className="bg-accent/5 border-accent/20 space-y-6 rounded-3xl border p-8">
          <h3 className="text-xl font-bold">Your Answer</h3>
          <Textarea
            placeholder="Help the community! Write your detailed answer here..."
            className="bg-background border-accent/20 focus:border-accent min-h-[200px] resize-none rounded-2xl p-6 text-lg"
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="lg"
              className="shadow-accent/20 rounded-full px-10 font-bold shadow-lg transition-transform active:scale-95"
              disabled={createAnswerMutation.isPending}
              onClick={handleSubmitAnswer}
            >
              Post Your Answer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
