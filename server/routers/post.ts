import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { 
  createPostSchema, 
  editPostSchema, 
  getPostsFilterSchema, 
  votePostSchema, 
  reactPostSchema 
} from "../schemas/post";
import { Prisma } from "@prisma/client";

const awardReputation = async (tx: Prisma.TransactionClient, userId: string, delta: number, reason: string) => {
  if (delta === 0) return;
  const user = await tx.user.findUnique({ where: { id: userId }, select: { reputation: true } });
  if (!user) return;
  const newRep = Math.max(0, user.reputation + delta);
  await tx.user.update({
    where: { id: userId },
    data: { reputation: newRep },
  });
};

export const postRouter = router({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...rest } = input;
      
      let statId: string | undefined = undefined;
      
      if (input.type === "DEVLOG") {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const stat = await ctx.prisma.dailyStat.findFirst({
          where: {
            userId: ctx.userId,
            date: {
              gte: today,
            }
          }
        });
        if (stat) statId = stat.id;
      }
      
      let slug = input.slug;
      if (input.type === "ARTICLE" && !slug) {
         slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
         const existing = await ctx.prisma.post.findUnique({ where: { slug } });
         if (existing) slug = `${slug}-${Date.now()}`;
      }

      const post = await ctx.prisma.post.create({
        data: {
          ...rest,
          slug,
          authorId: ctx.userId,
          statId,
          ...(tags && tags.length > 0 ? {
            tags: {
              create: tags.map(tag => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tag },
                    create: { name: tag, slug: tag.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
                  }
                }
              }))
            }
          } : {})
        },
      });
      
      return post;
    }),

  edit: protectedProcedure
    .input(editPostSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...rest } = input;
      
      const existing = await ctx.prisma.post.findUnique({ where: { id } });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
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
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { username: true, id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          tags: { include: { tag: true } },
          stats: true,
        }
      });
      
      if (!post || post.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      if (post.privacy === "PRIVATE" && post.authorId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      return post;
    }),

  getByUser: publicProcedure
    .input(getPostsFilterSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, authorId, type, tag, privacy } = input;
      
      const items = await ctx.prisma.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          authorId,
          type,
          deletedAt: null,
          ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
          privacy: ctx.userId === authorId ? privacy : "PUBLIC", 
        },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          tags: { include: { tag: true } },
        }
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  getMyPosts: protectedProcedure
    .input(z.object({ type: z.nativeEnum(Prisma.PostTypeEnum).optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const { type, limit } = input;
      const items = await ctx.prisma.post.findMany({
        take: limit,
        where: {
          authorId: ctx.userId,
          type,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: { tags: { include: { tag: true } } }
      });
      return { items };
    }),

  getFeed: publicProcedure
    .input(getPostsFilterSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, type, tag } = input;
      
      const items = await ctx.prisma.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          type,
          privacy: "PUBLIC",
          deletedAt: null,
          ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          tags: { include: { tag: true } },
        }
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  vote: protectedProcedure
    .input(votePostSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, value } = input;
      
      const post = await ctx.prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      const existingVote = await ctx.prisma.vote.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: ctx.userId,
          }
        }
      });

      return await ctx.prisma.$transaction(async (tx) => {
        if (value === 0) {
          if (existingVote) {
            await tx.vote.delete({ where: { id: existingVote.id } });
            // Simplified reputation rollback
            const delta = existingVote.value === 1 ? (post.type === "ANSWER" ? -10 : -5) : 2;
            await awardReputation(tx, post.authorId, delta, "unvote");
          }
        } else {
          await tx.vote.upsert({
            where: { postId_userId: { postId, userId: ctx.userId } },
            update: { value },
            create: { postId, userId: ctx.userId, value },
          });
          
          if (!existingVote || existingVote.value !== value) {
            const delta = value === 1 ? (post.type === "ANSWER" ? 10 : 5) : -2;
            const reputationChange = existingVote ? delta - (existingVote.value === 1 ? (post.type === "ANSWER" ? 10 : 5) : -2) : delta;
            await awardReputation(tx, post.authorId, reputationChange, "vote");
          }
        }
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

  getStreak: protectedProcedure
    .query(async ({ ctx }) => {
      return { streak: 0 };
    }),

  react: protectedProcedure
    .input(reactPostSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, reaction } = input;
      
      const existing = await ctx.prisma.reaction.findUnique({
        where: {
          postId_userId_type: { postId, userId: ctx.userId, type: reaction }
        }
      });

      if (existing) {
        await ctx.prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        await ctx.prisma.reaction.create({
          data: { postId, userId: ctx.userId, type: reaction }
        });
      }
      return { success: true };
    }),
});
