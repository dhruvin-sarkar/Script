'use client';

import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Heart, Lightbulb, Star, ThumbsUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ReactionType = 'LIKE' | 'HEART' | 'UNICORN' | 'LIGHTBULB';

interface BlogArticleClientProps {
  postId: string;
  currentUserId: string | null;
  initialReactions: Array<{ userId: string; type: ReactionType }>;
}

const reactionConfig: Array<{
  type: ReactionType;
  label: string;
  icon: typeof ThumbsUp;
}> = [
  { type: 'LIKE', label: 'Like', icon: ThumbsUp },
  { type: 'HEART', label: 'Love', icon: Heart },
  { type: 'UNICORN', label: 'Unicorn', icon: Star },
  { type: 'LIGHTBULB', label: 'Insightful', icon: Lightbulb },
];

export function BlogArticleClient({
  postId,
  currentUserId,
  initialReactions,
}: BlogArticleClientProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const incrementViews = api.blog.incrementViews.useMutation();
  const reactMutation = api.blog.react.useMutation();

  useEffect(() => {
    void incrementViews.mutateAsync({ postId });
  }, [incrementViews, postId]);

  const reactionCounts = useMemo(() => {
    return reactionConfig.reduce<Record<ReactionType, number>>(
      (accumulator, reaction) => ({
        ...accumulator,
        [reaction.type]: reactions.filter((item) => item.type === reaction.type).length,
      }),
      {
        LIKE: 0,
        HEART: 0,
        UNICORN: 0,
        LIGHTBULB: 0,
      },
    );
  }, [reactions]);

  return (
    <div className="flex flex-wrap gap-2">
      {reactionConfig.map((reaction) => {
        const Icon = reaction.icon;
        const active = currentUserId
          ? reactions.some((item) => item.userId === currentUserId && item.type === reaction.type)
          : false;

        return (
          <Button
            key={reaction.type}
            variant={active ? 'default' : 'outline'}
            onClick={async () => {
              if (!currentUserId) {
                return;
              }

              const wasActive = active;
              setReactions((current) =>
                wasActive
                  ? current.filter(
                      (item) => !(item.userId === currentUserId && item.type === reaction.type),
                    )
                  : [...current, { userId: currentUserId, type: reaction.type }],
              );

              try {
                await reactMutation.mutateAsync({
                  postId,
                  reaction: reaction.type,
                });
              } catch {
                setReactions(initialReactions);
              }
            }}
          >
            <Icon className="mr-1 h-4 w-4" />
            {reaction.label} · {reactionCounts[reaction.type]}
          </Button>
        );
      })}
    </div>
  );
}
