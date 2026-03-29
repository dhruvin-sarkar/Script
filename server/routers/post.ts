import { PostType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  createPostSchema,
  editPostSchema,
  getPostsFilterSchema,
  reactPostSchema,
  votePostSchema,
} from '../schemas/post';
import { awardReputation, type ReputationReason } from '../services/reputation';
import { protectedProcedure, publicProcedure, router } from '../trpc';

const getPostVoteDelta = (
  postType: PostType,
  value: 1 | -1,
): { delta: number; reason: ReputationReason } => {
  if (postType === PostType.ANSWER) {
    return value === 1
      ? { delta: 10, reason: 'answer_upvoted' }
      : { delta: -2, reason: 'answer_downvoted' };
  }

  return value === 1
    ? { delta: 5, reason: 'question_upvoted' }
    : { delta: -2, reason: 'post_downvoted' };
};

const PUBLIC_DISCOVERY_TYPES = [
  PostType.DEVLOG,
  PostType.QUESTION,
  PostType.DISCUSSION,
  PostType.SHOWCASE,
] as const;

function getPublicContentFilter(type?: PostType) {
  if (!type) {
    return {
      OR: [
        {
          type: {
            in: [...PUBLIC_DISCOVERY_TYPES],
          },
        },
        {
          type: PostType.ARTICLE,
          published: true,
        },
      ],
    };
  }

  if (type === PostType.ARTICLE) {
    return {
      type: PostType.ARTICLE,
      published: true,
    };
  }

  return { type };
}

export const postRouter = router({
  create: protectedProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
    const { tags, ...rest } = input;

    let statId: string | undefined = undefined;

    if (input.type === 'DEVLOG') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stat = await ctx.prisma.dailyStat.findFirst({
        where: {
          userId: ctx.userId,
          date: {
            gte: today,
          },
        },
      });
      if (stat) statId = stat.id;
    }

    let slug = input.slug;
    if (input.type === 'ARTICLE' && !slug) {
      slug = (input.title ?? 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = await ctx.prisma.post.findFirst({
        where: {
          authorId: ctx.userId,
          slug,
        },
        select: { id: true },
      });
      if (existing) slug = `${slug}-${Date.now()}`;
    }

    const post = await ctx.prisma.post.create({
      data: {
        ...rest,
        slug,
        authorId: ctx.userId,
        statId,
        ...(tags && tags.length > 0
          ? {
              tags: {
                create: tags.map((tag) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tag },
                      create: { name: tag, slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
                    },
                  },
                })),
              },
            }
          : {}),
      },
    });

    return post;
  }),

  edit: protectedProcedure.input(editPostSchema).mutation(async ({ ctx, input }) => {
    const { id, tags, ...rest } = input;
    void tags;

    const existing = await ctx.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.authorId !== ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const post = await ctx.prisma.post.update({
      where: { id },
      data: rest,
    });
    return post;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.post.findUnique({ where: { id: input.id } });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        tags: { include: { tag: true } },
        statSnapshot: true,
      },
    });

    if (!post || post.deletedAt) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (post.privacy === 'PRIVATE' && post.authorId !== ctx.userId) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return post;
  }),

  getByUser: publicProcedure.input(getPostsFilterSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, authorId, type, tag, privacy } = input;
    const isOwner = ctx.userId === authorId;

    const items = await ctx.prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        authorId,
        deletedAt: null,
        ...(isOwner ? { type } : getPublicContentFilter(type)),
        ...(tag
          ? {
              tags: {
                some: {
                  tag: {
                    OR: [{ name: tag }, { slug: tag.toLowerCase() }],
                  },
                },
              },
            }
          : {}),
        privacy: isOwner ? privacy : 'PUBLIC',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return { items, nextCursor };
  }),

  getMyPosts: protectedProcedure
    .input(z.object({ type: z.nativeEnum(PostType).optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const { type, limit } = input;
      const items = await ctx.prisma.post.findMany({
        take: limit,
        where: {
          authorId: ctx.userId,
          type,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: { tags: { include: { tag: true } } },
      });
      return { items };
    }),

  getDiscover: publicProcedure.input(getPostsFilterSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, type, tag } = input;

    const items = await ctx.prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        privacy: 'PUBLIC',
        deletedAt: null,
        ...getPublicContentFilter(type),
        ...(tag
          ? {
              tags: {
                some: {
                  tag: {
                    OR: [{ name: tag }, { slug: tag.toLowerCase() }],
                  },
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return { items, nextCursor };
  }),

  getFeed: protectedProcedure.input(getPostsFilterSchema).query(async ({ ctx, input }) => {
    const { limit, cursor, type, tag } = input;

    // Get the IDs of users the current user is following
    const following = await ctx.prisma.follow.findMany({
      where: { followerId: ctx.userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const items = await ctx.prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        authorId: { in: followingIds },
        privacy: 'PUBLIC',
        deletedAt: null,
        ...getPublicContentFilter(type),
        ...(tag
          ? {
              tags: {
                some: {
                  tag: {
                    OR: [{ name: tag }, { slug: tag.toLowerCase() }],
                  },
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        tags: { include: { tag: true } },
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return { items, nextCursor };
  }),

  vote: protectedProcedure.input(votePostSchema).mutation(async ({ ctx, input }) => {
    const { postId, value } = input;

    const post = await ctx.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new TRPCError({ code: 'NOT_FOUND' });

    const existingVote = await ctx.prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: ctx.userId,
          postId,
        },
      },
    });

    return await ctx.prisma.$transaction(async (tx) => {
      if (value === 0) {
        if (existingVote) {
          await tx.vote.delete({ where: { id: existingVote.id } });
          const previousVote = getPostVoteDelta(post.type, existingVote.value as 1 | -1);
          await awardReputation(
            ctx.prisma,
            post.authorId,
            -previousVote.delta,
            previousVote.reason,
            tx,
          );
        }
      } else {
        await tx.vote.upsert({
          where: { userId_postId: { userId: ctx.userId, postId } },
          update: { value },
          create: { postId, userId: ctx.userId, value },
        });

        if (!existingVote || existingVote.value !== value) {
          const nextVote = getPostVoteDelta(post.type, value as 1 | -1);
          const previousVote = existingVote
            ? getPostVoteDelta(post.type, existingVote.value as 1 | -1)
            : null;
          const reputationChange = previousVote
            ? nextVote.delta - previousVote.delta
            : nextVote.delta;

          await awardReputation(ctx.prisma, post.authorId, reputationChange, nextVote.reason, tx);
        }
      }
      return { success: true };
    });
  }),

  getAnswers: publicProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const answers = await ctx.prisma.post.findMany({
        where: { parentId: input.questionId, type: 'ANSWER', deletedAt: null },
        orderBy: [{ accepted: 'desc' }, { createdAt: 'asc' }],
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          votes: true,
        },
      });
      return answers;
    }),

  acceptAnswer: protectedProcedure
    .input(z.object({ answerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { answerId } = input;

      const answer = await ctx.prisma.post.findUnique({
        where: { id: answerId },
        include: { parent: true },
      });

      if (!answer || answer.type !== 'ANSWER' || !answer.parentId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (!answer.parent || answer.parent.authorId !== ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Only the question author can accept an answer',
        });
      }

      // Enforce only one accepted answer per question
      const existingAccepted = await ctx.prisma.post.findFirst({
        where: { parentId: answer.parentId, accepted: true },
      });
      if (existingAccepted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Question already has an accepted answer',
        });
      }

      return await ctx.prisma.$transaction(async (tx) => {
        // 1. Set answer.accepted = true
        await tx.post.update({
          where: { id: answerId },
          data: { accepted: true },
        });

        // 2. Set parent.solved = true
        await tx.post.update({
          where: { id: answer.parentId! },
          data: { solved: true },
        });

        // 3. Award +15 reputation to the answer author
        await awardReputation(ctx.prisma, answer.authorId, 15, 'answer_accepted', tx);

        // 4. Create Notification
        await tx.notification.create({
          data: {
            userId: answer.authorId,
            type: 'accepted',
            data: { postId: answerId, message: 'Your answer has been accepted!' },
          },
        });

        return { success: true };
      });
    }),

  incrementViews: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.post.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      });
      return { success: true };
    }),

  getStreak: protectedProcedure.query(async () => {
    return { streak: 0 };
  }),

  react: protectedProcedure.input(reactPostSchema).mutation(async ({ ctx, input }) => {
    const { postId, reaction } = input;

    const existing = await ctx.prisma.reaction.findUnique({
      where: {
        userId_postId_type: { postId, userId: ctx.userId, type: reaction },
      },
    });

    if (existing) {
      await ctx.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await ctx.prisma.reaction.create({
        data: { postId, userId: ctx.userId, type: reaction },
      });
    }
    return { success: true };
  }),
});
