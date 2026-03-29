'use client';

import { SignInButton, useAuth } from '@clerk/nextjs';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';

interface TagFollowButtonProps {
  slug: string;
  isFollowing: boolean;
  className?: string;
}

export function TagFollowButton({ slug, isFollowing, className }: TagFollowButtonProps) {
  const { isSignedIn } = useAuth();
  const utils = api.useUtils();

  const followMutation = api.tag.follow.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.search.invalidate(),
        utils.tag.getTrending.invalidate(),
        utils.tag.getBySlug.invalidate(),
        utils.feed.getFollowing.invalidate(),
      ]);
    },
  });

  const unfollowMutation = api.tag.unfollow.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.search.invalidate(),
        utils.tag.getTrending.invalidate(),
        utils.tag.getBySlug.invalidate(),
        utils.feed.getFollowing.invalidate(),
      ]);
    },
  });

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline" className={className}>
          Follow
        </Button>
      </SignInButton>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      className={className}
      disabled={isPending}
      onClick={() => {
        if (isFollowing) {
          unfollowMutation.mutate({ slug });
          return;
        }

        followMutation.mutate({ slug });
      }}
    >
      {isPending ? 'Saving...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
