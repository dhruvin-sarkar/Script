import { PostType, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { checkAndAwardBadges } from '../services/badges';
import { invalidateUnreadNotificationCache } from '../services/notifications';
import { awardReputation, type ReputationReason } from '../services/reputation';
import { enforceRateLimit, rateLimiters } from '../services/rate-limit';
import { queueSearchSync } from '../services/search';
import { buildTagCreateData, replacePostTags } from '../services/tags';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  acceptAnswerSchema,
  createAnswerSchema,
  createThreadSchema,
  deleteAnswerSchema,
  deleteThreadSchema,
  forumByTagSchema,
  forumFeedSchema,
  forumTitleLookupSchema,
  getThreadSchema,
  updateAnswerSchema,
  updateThreadSchema,
  voteForumItemSchema,
} from '../schemas/forum';

const ANSWERS_PER_PAGE = 20;

const threadTypes = [PostType.QUESTION, PostType.DISCUSSION, PostType.SHOWCASE] as const;

const threadAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  reputation: true,
} satisfies Prisma.UserSelect;

const rowAuthorSelect = {
  username: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

function getVoteDelta(
  targetType: 'thread' | 'answer',
  value: 1 | -1,
): {
  delta: number;
  reason: ReputationReason;
} {
  if (targetType === 'answer') {
    return value === 1
      ? { delta: 10, reason: 'answer_upvoted' }
      : { delta: -2, reason: 'answer_downvoted' };
  }

  return value === 1
    ? { delta: 5, reason: 'question_upvoted' }
    : { delta: -2, reason: 'post_downvoted' };
}

async function createNotificationSafely(
  prisma: { notification: Prisma.TransactionClient['notification'] },
  userId: string,
  type: string,
  data: Prisma.InputJsonObject,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        data,
      },
    });
    await invalidateUnreadNotificationCache(userId);
  } catch (error) {
    console.error('[forum] notification failed', { userId, type, error });
  }
}

async function queueForumIndexUpdate(postId: string, shouldIndex: boolean): Promise<void> {
  try {
    await queueSearchSync({
      op: shouldIndex ? 'upsert' : 'delete',
      docId: postId,
      index: 'posts',
    });
  } catch (error) {
    console.error('[forum] failed to queue search sync', { postId, error });
  }
}

async function getThreadFeedPage(
  ctx: {
    prisma: {
      post: Prisma.TransactionClient['post'];
      tagFollow: Prisma.TransactionClient['tagFollow'];
    };
    userId: string | null;
  },
  input: {
    page: number;
    limit: number;
    type: 'QUESTION' | 'DISCUSSION' | 'SHOWCASE' | 'all';
    filter: 'latest' | 'unanswered' | 'hot' | 'my-tags';
    tag?: string;
  },
): Promise<{
  threads: Array<{
    id: string;
    title: string | null;
    type: 'QUESTION' | 'DISCUSSION' | 'SHOWCASE';
    solved: boolean;
    createdAt: Date;
    updatedAt: Date;
    viewCount: number;
    devlogId: string | null;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
      reputation: number;
    };
    tags: Array<{ name: string; slug: string }>;
    _count: { votes: number; answers: number };
  }>;
  totalCount: number;
  hasMore: boolean;
}> {
  const skip = (input.page - 1) * input.limit;
  const baseWhere: Prisma.PostWhereInput = {
    type: input.type === 'all' ? { in: [...threadTypes] } : input.type,
    deletedAt: null,
    ...(input.tag
      ? {
          tags: {
            some: {
              tag: {
                slug: input.tag,
              },
            },
          },
        }
      : {}),
  };

  if (input.filter === 'my-tags') {
    if (!ctx.userId) {
      return { threads: [], totalCount: 0, hasMore: false };
    }

    const followedTags = await ctx.prisma.tagFollow.findMany({
      where: { userId: ctx.userId },
      select: { tagId: true },
    });

    const followedTagIds = followedTags.map((tag) => tag.tagId);

    if (followedTagIds.length === 0) {
      return { threads: [], totalCount: 0, hasMore: false };
    }

    baseWhere.tags = {
      some: {
        tagId: {
          in: followedTagIds,
        },
      },
    };
  }

  const threads = await ctx.prisma.post.findMany({
    where: {
      ...baseWhere,
      ...(input.filter === 'hot'
        ? {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          }
        : {}),
    },
    orderBy:
      input.filter === 'latest' || input.filter === 'unanswered' || input.filter === 'my-tags'
        ? { createdAt: 'desc' }
        : { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      solved: true,
      createdAt: true,
      updatedAt: true,
      viewCount: true,
      devlogId: true,
      author: {
        select: threadAuthorSelect,
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
      votes: {
        select: {
          value: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
    take: input.filter === 'hot' || input.filter === 'unanswered' ? 200 : input.limit,
    skip: input.filter === 'hot' || input.filter === 'unanswered' ? 0 : skip,
  });

  let filteredThreads = threads;

  if (input.filter === 'unanswered') {
    filteredThreads = threads.filter((thread) => !thread.solved && thread._count.replies === 0);
  }

  if (input.filter === 'hot') {
    filteredThreads = [...threads].sort((left, right) => {
      const leftScore =
        left.votes.reduce((total, vote) => total + vote.value, 0) + left._count.replies * 2;
      const rightScore =
        right.votes.reduce((total, vote) => total + vote.value, 0) + right._count.replies * 2;
      return rightScore - leftScore;
    });
  }

  const paginatedThreads =
    input.filter === 'hot' || input.filter === 'unanswered'
      ? filteredThreads.slice(skip, skip + input.limit)
      : filteredThreads;

  return {
    threads: paginatedThreads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      type: thread.type as 'QUESTION' | 'DISCUSSION' | 'SHOWCASE',
      solved: thread.solved,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      viewCount: thread.viewCount,
      devlogId: thread.devlogId,
      author: thread.author,
      tags: thread.tags.map((tag) => tag.tag),
      _count: {
        votes: thread.votes.reduce((total, vote) => total + vote.value, 0),
        answers: thread._count.replies,
      },
    })),
    totalCount: filteredThreads.length,
    hasMore: skip + paginatedThreads.length < filteredThreads.length,
  };
}

export const forumRouter = router({
  createThread: protectedProcedure.input(createThreadSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(
      rateLimiters.forumCreateThread,
      `forum:create-thread:${ctx.userId}`,
      'You have reached the thread creation limit for now.',
    );

    let linkedDevlogId: string | undefined;

    if (input.devlogId) {
      const devlog = await ctx.prisma.post.findFirst({
        where: {
          id: input.devlogId,
          authorId: ctx.userId,
          type: PostType.DEVLOG,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!devlog) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only link your own devlogs.',
        });
      }

      linkedDevlogId = devlog.id;
    }

    const thread = await ctx.prisma.post.create({
      data: {
        authorId: ctx.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        solved: false,
        devlogId: linkedDevlogId,
        tags: {
          create: buildTagCreateData(input.tags),
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        solved: true,
        devlogId: true,
        createdAt: true,
        author: {
          select: threadAuthorSelect,
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
      },
    });

    queueMicrotask(async () => {
      try {
        const followers = await ctx.prisma.follow.findMany({
          where: {
            followingId: ctx.userId,
          },
          select: {
            followerId: true,
          },
        });

        for (const follower of followers) {
          await createNotificationSafely(ctx.prisma, follower.followerId, 'new_post', {
            actorId: ctx.userId,
            threadId: thread.id,
          });
        }
      } catch (error) {
        console.error('[forum] failed to notify followers about new thread', {
          threadId: thread.id,
          error,
        });
      }
    });

    await queueForumIndexUpdate(thread.id, true);

    if (input.type === PostType.QUESTION) {
      const totalQuestions = await ctx.prisma.post.count({
        where: {
          authorId: ctx.userId,
          type: PostType.QUESTION,
          deletedAt: null,
        },
      });
      await checkAndAwardBadges(ctx.prisma, ctx.userId, {
        type: 'question_created',
        totalQuestions,
      });
    }

    return {
      ...thread,
      tags: thread.tags.map((tag) => tag.tag),
    };
  }),

  getThread: publicProcedure.input(getThreadSchema).query(async ({ ctx, input }) => {
    const thread = await ctx.prisma.post.findFirst({
      where: {
        id: input.id,
        type: {
          in: [...threadTypes],
        },
      },
      select: {
        id: true,
        authorId: true,
        title: true,
        content: true,
        type: true,
        solved: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        viewCount: true,
        devlogId: true,
        author: {
          select: threadAuthorSelect,
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
        votes: {
          select: {
            value: true,
          },
        },
        linkedDevlog: {
          select: {
            id: true,
            title: true,
            content: true,
            logDate: true,
            statSnapshot: {
              select: {
                totalSec: true,
                languages: true,
                projects: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!thread || thread.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Thread not found.',
      });
    }

    const answersSkip = (input.answersPage - 1) * ANSWERS_PER_PAGE;
    const [answers, totalAnswers] = await Promise.all([
      ctx.prisma.post.findMany({
        where: {
          parentId: input.id,
          type: PostType.ANSWER,
          deletedAt: null,
        },
        skip: answersSkip,
        take: ANSWERS_PER_PAGE,
        orderBy: [{ accepted: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          authorId: true,
          content: true,
          accepted: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          author: {
            select: threadAuthorSelect,
          },
          votes: {
            select: {
              value: true,
            },
          },
        },
      }),
      ctx.prisma.post.count({
        where: {
          parentId: input.id,
          type: PostType.ANSWER,
          deletedAt: null,
        },
      }),
    ]);

    const currentUserVotes = ctx.userId
      ? await ctx.prisma.vote.findMany({
          where: {
            userId: ctx.userId,
            postId: {
              in: [input.id, ...answers.map((answer) => answer.id)],
            },
          },
          select: {
            postId: true,
            value: true,
          },
        })
      : [];

    await ctx.prisma.$executeRaw`
        UPDATE "Post"
        SET "viewCount" = "viewCount" + 1
        WHERE "id" = ${input.id}
      `;

    const voteMap = new Map(currentUserVotes.map((vote) => [vote.postId, vote.value]));

    return {
      thread: {
        ...thread,
        type: thread.type as 'QUESTION' | 'DISCUSSION' | 'SHOWCASE',
        tags: thread.tags.map((tag) => tag.tag),
        _count: {
          votes: thread.votes.reduce((total, vote) => total + vote.value, 0),
          answers: thread._count.replies,
        },
        userVote: (voteMap.get(thread.id) ?? null) as 1 | -1 | null,
        devlog: thread.linkedDevlog
          ? {
              id: thread.linkedDevlog.id,
              title: thread.linkedDevlog.title,
              whatIBuilt: thread.linkedDevlog.content,
              logDate: thread.linkedDevlog.logDate,
              wakatimeData: thread.linkedDevlog.statSnapshot,
            }
          : null,
      },
      answers: answers.map((answer) => ({
        id: answer.id,
        content: answer.content,
        accepted: answer.accepted,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
        deletedAt: answer.deletedAt,
        user: answer.author,
        _count: {
          votes: answer.votes.reduce((total, vote) => total + vote.value, 0),
        },
        userVote: (voteMap.get(answer.id) ?? null) as 1 | -1 | null,
      })),
      totalAnswers,
      hasMoreAnswers: answersSkip + answers.length < totalAnswers,
    };
  }),

  getFeed: publicProcedure
    .input(forumFeedSchema)
    .query(async ({ ctx, input }) => getThreadFeedPage(ctx, input)),

  updateThread: protectedProcedure.input(updateThreadSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.post.findFirst({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: {
          in: [...threadTypes],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Thread not found or not yours.',
      });
    }

    await ctx.prisma.$transaction(async (tx) => {
      const updateResult = await tx.post.updateMany({
        where: {
          id: input.id,
          authorId: ctx.userId,
          type: {
            in: [...threadTypes],
          },
          deletedAt: null,
        },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
        },
      });

      if (updateResult.count === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Thread not found or not yours.',
        });
      }

      if (input.tags) {
        await replacePostTags(tx, input.id, input.tags);
      }
    });

    await queueForumIndexUpdate(input.id, true);

    return { success: true };
  }),

  deleteThread: protectedProcedure.input(deleteThreadSchema).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.post.updateMany({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: {
          in: [...threadTypes],
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Thread not found or not yours.',
      });
    }

    await queueForumIndexUpdate(input.id, false);

    return { success: true };
  }),

  createAnswer: protectedProcedure.input(createAnswerSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(
      rateLimiters.forumCreateAnswer,
      `forum:create-answer:${ctx.userId}`,
      'You are answering too quickly. Please try again later.',
    );

    const thread = await ctx.prisma.post.findFirst({
      where: {
        id: input.threadId,
        type: {
          in: [...threadTypes],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!thread) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Thread not found.',
      });
    }

    if (thread.authorId === ctx.userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You cannot answer your own question',
      });
    }

    const answer = await ctx.prisma.post.create({
      data: {
        authorId: ctx.userId,
        type: PostType.ANSWER,
        content: input.content,
        parentId: input.threadId,
        accepted: false,
      },
      select: {
        id: true,
        content: true,
        accepted: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: threadAuthorSelect,
        },
        votes: {
          select: {
            value: true,
          },
        },
      },
    });

    queueMicrotask(async () => {
      await createNotificationSafely(ctx.prisma, thread.authorId, 'answer', {
        actorId: ctx.userId,
        threadId: input.threadId,
        answerId: answer.id,
      });
    });

    return {
      ...answer,
      user: answer.author,
      _count: {
        votes: answer.votes.reduce((total, vote) => total + vote.value, 0),
      },
    };
  }),

  updateAnswer: protectedProcedure.input(updateAnswerSchema).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.post.updateMany({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ANSWER,
        deletedAt: null,
      },
      data: {
        content: input.content,
      },
    });

    if (result.count === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Answer not found or not yours.',
      });
    }

    return { success: true };
  }),

  deleteAnswer: protectedProcedure.input(deleteAnswerSchema).mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.post.updateMany({
      where: {
        id: input.id,
        authorId: ctx.userId,
        type: PostType.ANSWER,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Answer not found or not yours.',
      });
    }

    return { success: true };
  }),

  acceptAnswer: protectedProcedure.input(acceptAnswerSchema).mutation(async ({ ctx, input }) => {
    const acceptedAnswer = await ctx.prisma.$transaction(async (tx) => {
      const answer = await tx.post.findFirst({
        where: {
          id: input.answerId,
          type: PostType.ANSWER,
          deletedAt: null,
        },
        select: {
          id: true,
          authorId: true,
          parentId: true,
        },
      });

      if (!answer || !answer.parentId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Answer not found.',
        });
      }

      const thread = await tx.post.findFirst({
        where: {
          id: answer.parentId,
          type: {
            in: [...threadTypes],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          authorId: true,
          solved: true,
        },
      });

      if (!thread) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Thread not found.',
        });
      }

      if (thread.authorId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the thread author can accept an answer.',
        });
      }

      if (thread.solved) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Already solved',
        });
      }

      const existingAccepted = await tx.post.findFirst({
        where: {
          parentId: answer.parentId,
          accepted: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingAccepted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Another answer is already accepted.',
        });
      }

      await tx.post.update({
        where: { id: answer.id },
        data: { accepted: true },
      });

      await tx.post.update({
        where: { id: thread.id },
        data: { solved: true },
      });

      await awardReputation(ctx.prisma, answer.authorId, 15, 'answer_accepted', tx);

      try {
        await tx.notification.create({
          data: {
            userId: answer.authorId,
            type: 'accepted',
            data: {
              actorId: ctx.userId,
              threadId: thread.id,
              answerId: answer.id,
            },
          },
        });
      } catch (error) {
        console.error('[forum] failed to create accepted notification', {
          answerId: answer.id,
          error,
        });
      }

      return answer;
    });

    await invalidateUnreadNotificationCache(acceptedAnswer.authorId);

    const totalAccepted = await ctx.prisma.post.count({
      where: {
        authorId: acceptedAnswer.authorId,
        type: PostType.ANSWER,
        accepted: true,
        deletedAt: null,
      },
    });

    await checkAndAwardBadges(ctx.prisma, acceptedAnswer.authorId, {
      type: 'answer_accepted',
      totalAccepted,
    });

    return { success: true };
  }),

  vote: protectedProcedure.input(voteForumItemSchema).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(
      rateLimiters.forumVote,
      `forum:vote:${ctx.userId}`,
      'You are voting too quickly. Please slow down.',
    );

    const target = await ctx.prisma.post.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null,
        type: input.targetType === 'thread' ? { in: [...threadTypes] } : PostType.ANSWER,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!target) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Vote target not found.',
      });
    }

    if (target.authorId === ctx.userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You cannot vote on your own content',
      });
    }

    const existingVote = await ctx.prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: ctx.userId,
          postId: input.targetId,
        },
      },
    });

    const result = await ctx.prisma.$transaction(async (tx) => {
      let nextVoteValue: number | null = input.value;

      if (existingVote?.value === input.value) {
        await tx.vote.delete({
          where: { id: existingVote.id },
        });
        const { delta, reason } = getVoteDelta(input.targetType, input.value);
        await awardReputation(ctx.prisma, target.authorId, -delta, reason, tx);
        nextVoteValue = null;
      } else if (existingVote) {
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { value: input.value },
        });

        const previous = getVoteDelta(input.targetType, existingVote.value as 1 | -1);
        const next = getVoteDelta(input.targetType, input.value);
        await awardReputation(
          ctx.prisma,
          target.authorId,
          next.delta - previous.delta,
          next.reason,
          tx,
        );
        nextVoteValue = input.value;
      } else {
        await tx.vote.create({
          data: {
            userId: ctx.userId,
            postId: input.targetId,
            value: input.value,
          },
        });
        const { delta, reason } = getVoteDelta(input.targetType, input.value);
        await awardReputation(ctx.prisma, target.authorId, delta, reason, tx);
      }

      const votes = await tx.vote.findMany({
        where: {
          postId: input.targetId,
        },
        select: {
          value: true,
        },
      });

      return {
        voteValue: nextVoteValue,
        newScore: votes.reduce((total, vote) => total + vote.value, 0),
      };
    });

    return {
      success: true,
      ...result,
    };
  }),

  getByTag: publicProcedure.input(forumByTagSchema).query(async ({ ctx, input }) =>
    getThreadFeedPage(ctx, {
      page: input.page,
      limit: 20,
      type: 'all',
      filter: 'latest',
      tag: input.tag,
    }),
  ),

  checkSimilarTitles: publicProcedure
    .input(forumTitleLookupSchema)
    .query(async ({ ctx, input }) => {
      const threads = await ctx.prisma.post.findMany({
        where: {
          type: {
            in: [...threadTypes],
          },
          deletedAt: null,
          title: {
            contains: input.title,
            mode: 'insensitive',
          },
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          type: true,
        },
      });

      return threads;
    }),
});
