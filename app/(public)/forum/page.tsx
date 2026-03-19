import { Suspense } from 'react';

import { ForumHomeClient } from '@/components/forum/ForumHomeClient';
import { prisma } from '@/server/db';

export default async function ForumPage() {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const [topTags, topContributors] = await Promise.all([
    prisma.tag.findMany({
      orderBy: {
        postCount: 'desc',
      },
      take: 10,
      select: {
        name: true,
        slug: true,
        postCount: true,
      },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        posts: {
          some: {
            deletedAt: null,
            createdAt: {
              gte: oneWeekAgo,
            },
          },
        },
      },
      orderBy: {
        reputation: 'desc',
      },
      take: 5,
      select: {
        username: true,
        displayName: true,
        avatar: true,
        reputation: true,
      },
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[40vh] w-full max-w-7xl items-center justify-center px-6 py-12 text-sm text-[var(--text-muted)]">
          Loading forum...
        </div>
      }
    >
      <ForumHomeClient
        topTags={topTags}
        trendingTags={topTags.slice(0, 8)}
        topContributors={topContributors}
      />
    </Suspense>
  );
}
