import { PostType, Privacy, type Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  listTagsSchema,
  searchTagsSchema,
  tagBySlugSchema,
  tagFollowSchema,
  trendingTagsSchema,
} from '../schemas/tag';
import { enforceRateLimit, rateLimiters } from '../services/rate-limit';

const PUBLIC_POST_FILTER: Prisma.PostWhereInput = {
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

function mapTagSummary(
  tag: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    _count: { followers: number };
  },
  postCount: number,
  isFollowing: boolean,
) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    color: tag.color,
    postCount,
    followerCount: tag._count.followers,
    isFollowing,
  };
}

export const tagRouter = router({
  list: publicProcedure.input(listTagsSchema).query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.limit;
    const groupedTags = await ctx.prisma.postTag.groupBy({
      by: ['tagId'],
      where: {
        post: PUBLIC_POST_FILTER,
      },
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: 'desc',
        },
      },
      skip: offset,
      take: input.limit + 1,
    });

    const hasMore = groupedTags.length > input.limit;
    const pageRows = hasMore ? groupedTags.slice(0, input.limit) : groupedTags;
    const tagIds = pageRows.map((row) => row.tagId);

    const tags = await ctx.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    const followedTagIds =
      ctx.userId && tagIds.length > 0
        ? new Set(
            (
              await ctx.prisma.tagFollow.findMany({
                where: {
                  userId: ctx.userId,
                  tagId: {
                    in: tagIds,
                  },
                },
                select: {
                  tagId: true,
                },
              })
            ).map((row) => row.tagId),
          )
        : new Set<string>();

    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    return {
      items: pageRows
        .map((row) => {
          const tag = tagMap.get(row.tagId);
          if (!tag) {
            return null;
          }

          return mapTagSummary(tag, row._count.tagId, followedTagIds.has(row.tagId));
        })
        .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
      hasMore,
    };
  }),

  search: publicProcedure.input(searchTagsSchema).query(async ({ ctx, input }) => {
    const tags = await ctx.prisma.tag.findMany({
      where: {
        OR: [
          {
            name: {
              contains: input.q,
              mode: 'insensitive',
            },
          },
          {
            slug: {
              contains: input.q.toLowerCase(),
            },
          },
        ],
      },
      take: input.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    const tagIds = tags.map((tag) => tag.id);
    const counts = await ctx.prisma.postTag.groupBy({
      by: ['tagId'],
      where: {
        tagId: {
          in: tagIds,
        },
        post: PUBLIC_POST_FILTER,
      },
      _count: {
        tagId: true,
      },
    });

    const followedTagIds =
      ctx.userId && tagIds.length > 0
        ? new Set(
            (
              await ctx.prisma.tagFollow.findMany({
                where: {
                  userId: ctx.userId,
                  tagId: {
                    in: tagIds,
                  },
                },
                select: {
                  tagId: true,
                },
              })
            ).map((row) => row.tagId),
          )
        : new Set<string>();

    const countMap = new Map(counts.map((row) => [row.tagId, row._count.tagId]));

    return tags
      .map((tag) => mapTagSummary(tag, countMap.get(tag.id) ?? 0, followedTagIds.has(tag.id)))
      .sort((left, right) => {
        if (right.postCount !== left.postCount) {
          return right.postCount - left.postCount;
        }

        return right.followerCount - left.followerCount;
      });
  }),

  getTrending: publicProcedure.input(trendingTagsSchema).query(async ({ ctx, input }) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const groupedTags = await ctx.prisma.postTag.groupBy({
      by: ['tagId'],
      where: {
        post: {
          ...PUBLIC_POST_FILTER,
          createdAt: {
            gte: oneWeekAgo,
          },
        },
      },
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: 'desc',
        },
      },
      take: input.limit,
    });

    const tagIds = groupedTags.map((row) => row.tagId);
    const tags = await ctx.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    const followedTagIds =
      ctx.userId && tagIds.length > 0
        ? new Set(
            (
              await ctx.prisma.tagFollow.findMany({
                where: {
                  userId: ctx.userId,
                  tagId: {
                    in: tagIds,
                  },
                },
                select: {
                  tagId: true,
                },
              })
            ).map((row) => row.tagId),
          )
        : new Set<string>();

    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    return groupedTags
      .map((row) => {
        const tag = tagMap.get(row.tagId);
        if (!tag) {
          return null;
        }

        return mapTagSummary(tag, row._count.tagId, followedTagIds.has(row.tagId));
      })
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null);
  }),

  getBySlug: publicProcedure.input(tagBySlugSchema).query(async ({ ctx, input }) => {
    const tag = await ctx.prisma.tag.findUnique({
      where: { slug: input.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    if (!tag) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tag not found.',
      });
    }

    const [postCount, isFollowing] = await Promise.all([
      ctx.prisma.postTag.count({
        where: {
          tagId: tag.id,
          post: PUBLIC_POST_FILTER,
        },
      }),
      ctx.userId
        ? ctx.prisma.tagFollow.findUnique({
            where: {
              userId_tagId: {
                userId: ctx.userId,
                tagId: tag.id,
              },
            },
            select: {
              tagId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return mapTagSummary(tag, postCount, Boolean(isFollowing));
  }),

  follow: protectedProcedure.input(tagFollowSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(rateLimiters.tagFollow, `tag-follow:${ctx.userId}`);

    const tag = await ctx.prisma.tag.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (!tag) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tag not found.',
      });
    }

    await ctx.prisma.tagFollow.upsert({
      where: {
        userId_tagId: {
          userId: ctx.userId,
          tagId: tag.id,
        },
      },
      create: {
        userId: ctx.userId,
        tagId: tag.id,
      },
      update: {},
    });

    return { success: true };
  }),

  unfollow: protectedProcedure.input(tagFollowSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(rateLimiters.tagFollow, `tag-follow:${ctx.userId}`);

    const tag = await ctx.prisma.tag.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (!tag) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tag not found.',
      });
    }

    await ctx.prisma.tagFollow.deleteMany({
      where: {
        userId: ctx.userId,
        tagId: tag.id,
      },
    });

    return { success: true };
  }),
});
