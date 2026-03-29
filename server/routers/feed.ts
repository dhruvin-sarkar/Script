import { PostType, Privacy, type Prisma } from '@prisma/client';
import { router, protectedProcedure } from '../trpc';
import { followingFeedSchema } from '../schemas/feed';

type FeedFilter = 'all' | 'devlogs' | 'articles' | 'questions' | 'milestones';

const FEED_POST_TYPES = [
  PostType.DEVLOG,
  PostType.ARTICLE,
  PostType.QUESTION,
  PostType.DISCUSSION,
  PostType.SHOWCASE,
] as const;

const VISIBLE_POST_FILTER: Prisma.PostWhereInput = {
  deletedAt: null,
  privacy: Privacy.PUBLIC,
  OR: [
    {
      type: {
        in: [PostType.DEVLOG, PostType.QUESTION, PostType.DISCUSSION, PostType.SHOWCASE],
      },
    },
    {
      type: PostType.ARTICLE,
      published: true,
    },
  ],
};

function stripMarkdown(markdown: string): string {
  return markdown
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

function toExcerpt(content: string, fallback: string | null | undefined): string {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  const plainText = stripMarkdown(content);
  return plainText.length > 180 ? `${plainText.slice(0, 177).trimEnd()}...` : plainText;
}

function getPostFilter(filter: FeedFilter): Prisma.PostWhereInput | null {
  switch (filter) {
    case 'all':
      return { type: { in: [...FEED_POST_TYPES] } };
    case 'devlogs':
      return { type: PostType.DEVLOG };
    case 'articles':
      return { type: PostType.ARTICLE, published: true };
    case 'questions':
      return {
        type: {
          in: [PostType.QUESTION, PostType.DISCUSSION, PostType.SHOWCASE],
        },
      };
    case 'milestones':
      return null;
  }
}

function buildFollowingPostWhere(
  filter: FeedFilter,
  followingUserIds: string[],
  followedTagIds: string[],
): Prisma.PostWhereInput | null {
  const postFilter = getPostFilter(filter);

  if (postFilter === null || (followingUserIds.length === 0 && followedTagIds.length === 0)) {
    return null;
  }

  const followTargets: Prisma.PostWhereInput[] = [
    ...(followingUserIds.length > 0
      ? [{ authorId: { in: followingUserIds } } satisfies Prisma.PostWhereInput]
      : []),
    ...(followedTagIds.length > 0
      ? [
          {
            tags: {
              some: {
                tagId: {
                  in: followedTagIds,
                },
              },
            },
          } satisfies Prisma.PostWhereInput,
        ]
      : []),
  ];

  return {
    AND: [VISIBLE_POST_FILTER, postFilter, { OR: followTargets }],
  };
}

export const feedRouter = router({
  getFollowing: protectedProcedure.input(followingFeedSchema).query(async ({ ctx, input }) => {
    const windowSize = input.page * input.limit;
    const [followingUsers, followedTags] = await Promise.all([
      ctx.prisma.follow.findMany({
        where: { followerId: ctx.userId },
        select: { followingId: true },
      }),
      ctx.prisma.tagFollow.findMany({
        where: { userId: ctx.userId },
        select: { tagId: true },
      }),
    ]);

    const followingUserIds = followingUsers.map((follow) => follow.followingId);
    const followedTagIds = followedTags.map((tag) => tag.tagId);
    const followingPostWhere = buildFollowingPostWhere(
      input.filter,
      followingUserIds,
      followedTagIds,
    );
    const shouldLoadPosts = followingPostWhere !== null;
    const shouldLoadMilestones =
      (input.filter === 'all' || input.filter === 'milestones') && followingUserIds.length > 0;

    const [posts, milestones] = await Promise.all([
      shouldLoadPosts
        ? ctx.prisma.post.findMany({
            where: followingPostWhere,
            orderBy: { createdAt: 'desc' },
            take: windowSize + 1,
            select: {
              id: true,
              type: true,
              title: true,
              content: true,
              excerpt: true,
              slug: true,
              mood: true,
              solved: true,
              createdAt: true,
              publishedAt: true,
              readingTime: true,
              viewCount: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
              tags: {
                select: {
                  tag: {
                    select: {
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  votes: true,
                  comments: true,
                  replies: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadMilestones
        ? ctx.prisma.userBadge.findMany({
            where: {
              userId: {
                in: followingUserIds,
              },
            },
            orderBy: { awardedAt: 'desc' },
            take: windowSize + 1,
            select: {
              userId: true,
              badgeId: true,
              awardedAt: true,
              user: {
                select: {
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
              badge: {
                select: {
                  slug: true,
                  name: true,
                  description: true,
                  icon: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const mergedItems = [
      ...posts.map((post) => ({
        kind: 'post' as const,
        id: post.id,
        type: post.type,
        title: post.title,
        excerpt: toExcerpt(post.content, post.excerpt),
        slug: post.slug,
        mood: post.mood,
        solved: post.solved,
        createdAt: post.publishedAt ?? post.createdAt,
        readingTime: post.readingTime,
        viewCount: post.viewCount,
        author: post.author,
        tags: post.tags.map((tag) => tag.tag),
        counts: {
          votes: post._count.votes,
          comments: post._count.comments,
          answers: post._count.replies,
        },
      })),
      ...milestones.map((milestone) => ({
        kind: 'milestone' as const,
        id: `${milestone.userId}:${milestone.badgeId}:${milestone.awardedAt.toISOString()}`,
        createdAt: milestone.awardedAt,
        user: milestone.user,
        badge: milestone.badge,
      })),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, windowSize + 1);

    const start = (input.page - 1) * input.limit;

    return {
      items: mergedItems.slice(start, start + input.limit),
      hasMore: mergedItems.length > start + input.limit,
      followingUsersCount: followingUserIds.length,
      followingTagsCount: followedTagIds.length,
    };
  }),
});
