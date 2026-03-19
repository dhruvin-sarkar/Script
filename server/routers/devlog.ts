import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Prisma, Privacy, Mood } from '@prisma/client';
import { getWakatimeSnapshotForDate } from '../services/wakatime';

export const devlogRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        privacy: z.nativeEnum(Privacy).default(Privacy.PUBLIC),
        mood: z.nativeEnum(Mood).optional(),
        logDate: z.date(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, logDate, ...rest } = input;

      let statId: string | undefined = undefined;

      // Enforce linking WakaTime snapshot
      const dateStr = logDate.toISOString().split('T')[0];
      const snapshot = await getWakatimeSnapshotForDate(ctx.userId, dateStr);
      if (snapshot) statId = snapshot.id;

      const post = await ctx.prisma.post.create({
        data: {
          ...rest,
          type: 'DEVLOG',
          authorId: ctx.userId,
          logDate,
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().optional(),
        privacy: z.nativeEnum(Privacy).optional(),
        mood: z.nativeEnum(Mood).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      const existing = await ctx.prisma.post.findUnique({ where: { id } });
      if (!existing || existing.authorId !== ctx.userId || existing.type !== 'DEVLOG') {
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
      if (!existing || existing.authorId !== ctx.userId || existing.type !== 'DEVLOG') {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id, type: 'DEVLOG' },
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

  getByUser: publicProcedure
    .input(
      z.object({
        authorId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, authorId } = input;

      const items = await ctx.prisma.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          authorId,
          type: 'DEVLOG',
          deletedAt: null,
          privacy: ctx.userId === authorId ? undefined : { not: 'PRIVATE' },
        },
        orderBy: { logDate: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          tags: { include: { tag: true } },
          statSnapshot: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  getFeed: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

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
          type: 'DEVLOG',
          privacy: 'PUBLIC',
          deletedAt: null,
        },
        orderBy: { logDate: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          tags: { include: { tag: true } },
          statSnapshot: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  getStreak: protectedProcedure.query(async ({ ctx }) => {
    const logs = await ctx.prisma.post.findMany({
      where: {
        authorId: ctx.userId,
        type: 'DEVLOG',
        deletedAt: null,
        logDate: { not: null },
      },
      orderBy: { logDate: 'desc' },
      select: { logDate: true },
    });

    if (!logs.length) return { streak: 0 };

    let currentStreak = 0;

    const uniqueDates = Array.from(
      new Set(
        logs.map((l) => {
          const d = new Date(l.logDate!);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      ),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86400000);

    const hasToday = uniqueDates.includes(today.getTime());
    const hasYesterday = uniqueDates.includes(yesterday.getTime());

    if (!hasToday && !hasYesterday) {
      return { streak: 0 };
    }

    let checkDate = hasToday ? today : yesterday;

    while (uniqueDates.includes(checkDate.getTime())) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    }

    return { streak: currentStreak };
  }),
});
