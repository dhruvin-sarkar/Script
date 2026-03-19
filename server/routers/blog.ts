import { Prisma, PostType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { redis } from '@/lib/redis';
import { calculateReadingTime } from '@/lib/reading-time';
import { generateUniqueSlug } from '@/lib/slugify';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  createBlogSchema,
  createSeriesSchema,
  deleteBlogSchema,
  getBlogBySlugSchema,
  getBlogFeedSchema,
  getBlogsByUserSchema,
  getSeriesSchema,
  incrementBlogViewsSchema,
  reactToBlogSchema,
  togglePublishSchema,
  updateBlogSchema,
} from '../schemas/blog';
import { invalidateUnreadNotificationCache } from '../services/notifications';
import { enforceRateLimit, rateLimiters } from '../services/rate-limit';
import { queueSearchSync } from '../services/search';
import { buildTagCreateData, replacePostTags } from '../services/tags';

const PAGE_SIZE = 20;

const articleAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  bio: true,
  reputation: true,
} satisfies Prisma.UserSelect;

const articleTagSelect = {
  tag: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.PostTagSelect;

async function queueBlogIndexUpdate(
  postId: string,
  published: boolean,
  deletedAt: Date | null,
): Promise<void> {
  try {
    await queueSearchSync({
      op: published && !deletedAt ? 'upsert' : 'delete',
      docId: postId,
      index: 'posts',
    });
  } catch (error) {
    console.error('[blog] failed to queue search sync', { postId, error });
  }
}

export const blogRouter = router({
  create: protectedProcedure.input(createBlogSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(
      rateLimiters.blogCreate,
      `blog:create:${ctx.userId}`,
      'You have reached the article draft limit for now.',
    );

    const slug = await generateUniqueSlug(ctx.prisma, input.title, {
      authorId: ctx.userId,
    });
    const readingTime = calculateReadingTime(input.content);

    const article = await ctx.prisma.post.create({
      data: {
        authorId: ctx.userId,
        type: PostType.ARTICLE,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        slug,
        seoTitle: input.seoTitle,
        seoDesc: input.seoDesc,
        coverImage: input.coverImage,
        crossPostUrl: input.crossPostUrl,
        seriesId: input.seriesId,
        readingTime,
        published: false,
        publishedAt: null,
        tags: {
          create: buildTagCreateData(input.tags),
        },
      },
      select: {
        id: true,
        slug: true,
        published: true,
      },
    });

    return article;
  }),

  update: protectedProcedure.input(updateBlogSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.post.findFirst({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ARTICLE,
        deletedAt: null,
      },
      select: {
        id: true,
        published: true,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Article not found or not yours.',
      });
    }

    const updatedArticle = await ctx.prisma.$transaction(async (tx) => {
      const nextTitle = input.title ?? undefined;
      const nextContent = input.content ?? undefined;
      const nextSlug = nextTitle
        ? await generateUniqueSlug(tx, nextTitle, {
            authorId: ctx.userId,
            excludePostId: input.id,
          })
        : undefined;

      const updateResult = await tx.post.updateMany({
        where: {
          id: input.id,
          authorId: ctx.userId,
          type: PostType.ARTICLE,
          deletedAt: null,
        },
        data: {
          ...(nextTitle ? { title: nextTitle, slug: nextSlug } : {}),
          ...(nextContent
            ? { content: nextContent, readingTime: calculateReadingTime(nextContent) }
            : {}),
          ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
          ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
          ...(input.seoDesc !== undefined ? { seoDesc: input.seoDesc } : {}),
          ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
          ...(input.crossPostUrl !== undefined ? { crossPostUrl: input.crossPostUrl } : {}),
          ...(input.seriesId !== undefined ? { seriesId: input.seriesId } : {}),
        },
      });

      if (updateResult.count === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Article not found or not yours.',
        });
      }

      if (input.tags) {
        await replacePostTags(tx, input.id, input.tags);
      }

      const article = await tx.post.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          published: true,
          deletedAt: true,
        },
      });

      if (!article) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found after update.',
        });
      }

      return article;
    });

    await queueBlogIndexUpdate(
      updatedArticle.id,
      updatedArticle.published,
      updatedArticle.deletedAt,
    );

    return { success: true };
  }),

  publish: protectedProcedure.input(togglePublishSchema).mutation(async ({ ctx, input }) => {
    const article = await ctx.prisma.post.findFirst({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ARTICLE,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    if (!article) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Article not found or not yours.',
      });
    }

    await ctx.prisma.post.update({
      where: { id: input.id },
      data: {
        published: true,
        publishedAt: new Date(),
        slug: await generateUniqueSlug(ctx.prisma, article.title ?? 'article', {
          authorId: ctx.userId,
          excludePostId: input.id,
        }),
        readingTime: calculateReadingTime(article.content),
      },
    });

    await queueBlogIndexUpdate(input.id, true, null);

    return { success: true };
  }),

  unpublish: protectedProcedure.input(togglePublishSchema).mutation(async ({ ctx, input }) => {
    const updateResult = await ctx.prisma.post.updateMany({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ARTICLE,
        deletedAt: null,
      },
      data: {
        published: false,
        publishedAt: null,
      },
    });

    if (updateResult.count === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Article not found or not yours.',
      });
    }

    await queueBlogIndexUpdate(input.id, false, null);

    return { success: true };
  }),

  delete: protectedProcedure.input(deleteBlogSchema).mutation(async ({ ctx, input }) => {
    const updateResult = await ctx.prisma.post.updateMany({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ARTICLE,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Article not found or not yours.',
      });
    }

    await queueBlogIndexUpdate(input.id, false, new Date());

    return { success: true };
  }),

  getBySlug: publicProcedure.input(getBlogBySlugSchema).query(async ({ ctx, input }) => {
    const article = await ctx.prisma.post.findFirst({
      where: {
        type: PostType.ARTICLE,
        slug: input.slug,
        deletedAt: null,
        author: {
          username: input.username,
        },
      },
      select: {
        id: true,
        authorId: true,
        title: true,
        content: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        seoTitle: true,
        seoDesc: true,
        crossPostUrl: true,
        readingTime: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        viewCount: true,
        seriesId: true,
        author: {
          select: articleAuthorSelect,
        },
        tags: {
          select: articleTagSelect,
        },
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
        series: {
          select: {
            id: true,
            title: true,
            posts: {
              where: {
                type: PostType.ARTICLE,
                deletedAt: null,
                published: true,
              },
              orderBy: {
                publishedAt: 'asc',
              },
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Article not found.',
      });
    }

    if (!article.published && article.authorId !== ctx.userId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Article not found.',
      });
    }

    return article;
  }),

  getByUser: publicProcedure.input(getBlogsByUserSchema).query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { username: input.username, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    const isOwner = ctx.userId === user.id;
    const statusFilter = isOwner ? input.status : 'published';
    const skip = (input.page - 1) * input.limit;

    const where: Prisma.PostWhereInput = {
      authorId: user.id,
      type: PostType.ARTICLE,
      deletedAt: null,
      ...(statusFilter === 'draft' ? { published: false } : {}),
      ...(statusFilter === 'published' ? { published: true } : {}),
    };

    const [items, totalCount] = await Promise.all([
      ctx.prisma.post.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          readingTime: true,
          published: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          viewCount: true,
          crossPostUrl: true,
          tags: {
            select: articleTagSelect,
          },
          author: {
            select: articleAuthorSelect,
          },
        },
      }),
      ctx.prisma.post.count({ where }),
    ]);

    return {
      items,
      totalCount,
      hasMore: skip + items.length < totalCount,
    };
  }),

  getFeed: publicProcedure.input(getBlogFeedSchema).query(async ({ ctx, input }) => {
    const skip = (input.page - 1) * input.limit;
    const orderBy: Prisma.PostOrderByWithRelationInput[] =
      input.sort === 'most-viewed'
        ? [{ viewCount: 'desc' }, { publishedAt: 'desc' }]
        : [{ publishedAt: 'desc' }];

    const where: Prisma.PostWhereInput = {
      type: PostType.ARTICLE,
      published: true,
      deletedAt: null,
    };

    const [items, totalCount] = await Promise.all([
      ctx.prisma.post.findMany({
        where,
        skip,
        take: input.limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          readingTime: true,
          publishedAt: true,
          createdAt: true,
          viewCount: true,
          crossPostUrl: true,
          tags: {
            select: articleTagSelect,
          },
          author: {
            select: articleAuthorSelect,
          },
        },
      }),
      ctx.prisma.post.count({ where }),
    ]);

    return {
      items,
      totalCount,
      hasMore: skip + items.length < totalCount,
    };
  }),

  incrementViews: publicProcedure
    .input(incrementBlogViewsSchema)
    .mutation(async ({ ctx, input }) => {
      const article = await ctx.prisma.post.findFirst({
        where: {
          id: input.postId,
          type: PostType.ARTICLE,
          deletedAt: null,
          published: true,
        },
        select: { id: true },
      });

      if (!article) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Article not found.',
        });
      }

      const viewerId = ctx.userId ?? ctx.ip ?? 'anonymous';
      const cacheKey = `view:${viewerId}:${input.postId}`;
      const debounced = await redis.set(cacheKey, '1', {
        ex: 600,
        nx: true,
      });

      if (debounced === null) {
        return { success: true, debounced: true };
      }

      await ctx.prisma.post.update({
        where: { id: input.postId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return { success: true, debounced: false };
    }),

  react: protectedProcedure.input(reactToBlogSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(
      rateLimiters.blogReact,
      `blog:react:${ctx.userId}`,
      'You are reacting too quickly. Please slow down.',
    );

    const article = await ctx.prisma.post.findFirst({
      where: {
        id: input.postId,
        type: PostType.ARTICLE,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!article) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Article not found.',
      });
    }

    const existing = await ctx.prisma.reaction.findUnique({
      where: {
        userId_postId_type: {
          userId: ctx.userId,
          postId: input.postId,
          type: input.reaction,
        },
      },
    });

    if (existing) {
      await ctx.prisma.reaction.delete({
        where: { id: existing.id },
      });
    } else {
      await ctx.prisma.reaction.create({
        data: {
          userId: ctx.userId,
          postId: input.postId,
          type: input.reaction,
        },
      });
    }

    return { success: true, active: !existing };
  }),

  createSeries: protectedProcedure.input(createSeriesSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.series.create({
      data: {
        userId: ctx.userId,
        title: input.title,
        description: input.description,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
  }),

  getSeries: publicProcedure.input(getSeriesSchema).query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { username: input.username, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    const where: Prisma.SeriesWhereInput = {
      userId: user.id,
      ...(input.seriesId ? { id: input.seriesId } : {}),
    };

    const series = await ctx.prisma.series.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        posts: {
          where: {
            type: PostType.ARTICLE,
            deletedAt: null,
            ...(ctx.userId === user.id ? {} : { published: true }),
          },
          orderBy: {
            publishedAt: 'asc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            publishedAt: true,
          },
        },
      },
    });

    return series;
  }),
});
