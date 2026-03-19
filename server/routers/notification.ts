import { TRPCError } from '@trpc/server';
import { redis } from '@/lib/redis';
import { router, protectedProcedure } from '../trpc';
import { listNotificationsSchema, markNotificationsReadSchema } from '../schemas/notification';
import {
  getUnreadNotificationCacheKey,
  invalidateUnreadNotificationCache,
} from '../services/notifications';

const PAGE_SIZE = 10;

interface NotificationActor {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

function extractStringField(data: unknown, key: string): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const value = Reflect.get(data, key);
  return typeof value === 'string' ? value : null;
}

export const notificationRouter = router({
  list: protectedProcedure.input(listNotificationsSchema).query(async ({ ctx, input }) => {
    const skip = (input.page - 1) * PAGE_SIZE;

    const [notifications, unreadCount, totalCount] = await Promise.all([
      ctx.prisma.notification.findMany({
        where: {
          userId: ctx.userId,
          ...(input.unreadOnly ? { isRead: false } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
      }),
      ctx.prisma.notification.count({
        where: {
          userId: ctx.userId,
          isRead: false,
        },
      }),
      ctx.prisma.notification.count({
        where: {
          userId: ctx.userId,
          ...(input.unreadOnly ? { isRead: false } : {}),
        },
      }),
    ]);

    const actorIds = Array.from(
      new Set(
        notifications
          .map((notification) => extractStringField(notification.data, 'actorId'))
          .filter((actorId): actorId is string => Boolean(actorId)),
      ),
    );

    const relatedPostIds = Array.from(
      new Set(
        notifications
          .flatMap((notification) => [
            extractStringField(notification.data, 'threadId'),
            extractStringField(notification.data, 'postId'),
          ])
          .filter((postId): postId is string => Boolean(postId)),
      ),
    );

    const actors = actorIds.length
      ? await ctx.prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        })
      : [];

    const actorMap = new Map<string, NotificationActor>(actors.map((actor) => [actor.id, actor]));

    const relatedPosts = relatedPostIds.length
      ? await ctx.prisma.post.findMany({
          where: {
            id: {
              in: relatedPostIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            type: true,
          },
        })
      : [];

    const relatedPostMap = new Map(relatedPosts.map((post) => [post.id, post]));

    return {
      notifications: notifications.map((notification) => ({
        ...notification,
        actor: (() => {
          const actorId = extractStringField(notification.data, 'actorId');
          return actorId ? (actorMap.get(actorId) ?? null) : null;
        })(),
        threadTitle: (() => {
          const threadId = extractStringField(notification.data, 'threadId');
          return threadId ? (relatedPostMap.get(threadId)?.title ?? null) : null;
        })(),
        relatedPostType: (() => {
          const postId =
            extractStringField(notification.data, 'postId') ??
            extractStringField(notification.data, 'threadId');
          return postId ? (relatedPostMap.get(postId)?.type ?? null) : null;
        })(),
      })),
      unreadCount,
      hasMore: skip + notifications.length < totalCount,
    };
  }),

  markRead: protectedProcedure
    .input(markNotificationsReadSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const result = await ctx.prisma.notification.updateMany({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
          data: {
            isRead: true,
          },
        });

        if (result.count === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notification not found.',
          });
        }
      } else {
        await ctx.prisma.notification.updateMany({
          where: {
            userId: ctx.userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });
      }

      await invalidateUnreadNotificationCache(ctx.userId);

      return { success: true };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = getUnreadNotificationCacheKey(ctx.userId);
    const cached = await redis.get<number>(cacheKey);

    if (typeof cached === 'number') {
      return { unreadCount: cached };
    }

    const unreadCount = await ctx.prisma.notification.count({
      where: {
        userId: ctx.userId,
        isRead: false,
      },
    });

    await redis.set(cacheKey, unreadCount, { ex: 60 });

    return { unreadCount };
  }),
});
