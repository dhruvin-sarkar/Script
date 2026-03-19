import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import { sanitizeProfileCSS } from '../services/css';
import {
  updateProfileSchema,
  updateCustomCSSSchema,
  addExperienceSchema,
  addEducationSchema,
} from '../schemas/user';

export const userRouter = router({
  checkUsername: protectedProcedure
    .input(z.object({ username: z.string().min(3).max(20) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) return { available: false };

      const existing = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      });
      return { available: !existing || existing.id === ctx.userId };
    }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20),
        firstDevlog: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { username, firstDevlog } = input;

      if (!ctx.userId || !ctx.clerkId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Ensure username is unique
      const existing = await ctx.prisma.user.findUnique({
        where: { username },
      });
      if (existing && existing.id !== ctx.userId) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Username is taken' });
      }

      // Update user in DB
      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { username },
      });

      // Update Clerk public metadata
      const client = await clerkClient();
      await client.users.updateUserMetadata(ctx.clerkId, {
        publicMetadata: { onboardingComplete: true },
      });

      // Optionally create the first devlog
      if (firstDevlog && firstDevlog.trim().length > 0) {
        await ctx.prisma.post.create({
          data: {
            type: 'DEVLOG',
            title: `First Devlog by ${username}`,
            content: firstDevlog,
            authorId: ctx.userId,
            privacy: 'PUBLIC',
            logDate: new Date(),
          },
        });
      }

      return { success: true };
    }),

  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username, deletedAt: null },
        include: {
          profile: {
            include: {
              experiences: { orderBy: { startDate: 'desc' } },
              educations: { orderBy: { startDate: 'desc' } },
            },
          },
          badges: { include: { badge: true } },
          _count: {
            select: { followers: true, following: true, posts: true },
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Check if current user follows them
      let isFollowing = false;
      if (ctx.userId) {
        const follow = await ctx.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: ctx.userId,
              followingId: user.id,
            },
          },
        });
        isFollowing = !!follow;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clerkId, ...safeUser } = user;

      // Hide customCSS from other users
      if (ctx.userId !== user.id) {
        safeUser.customCSS = null;
      }

      return { ...safeUser, isFollowing };
    }),

  updateAvatar: protectedProcedure
    .input(z.object({ avatar: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const r2PublicUrl = process.env.R2_PUBLIC_URL || '';
      if (
        !input.avatar.startsWith(r2PublicUrl) &&
        !input.avatar.startsWith('https://img.clerk.com')
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid avatar URL' });
      }

      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { avatar: input.avatar },
      });

      return { success: true };
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const followers = await ctx.prisma.follow.findMany({
        where: { followingId: input.userId },
        include: {
          follower: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
        take: input.limit,
      });
      return followers.map((f) => f.follower);
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.prisma.follow.findMany({
        where: { followerId: input.userId },
        include: {
          following: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
        take: input.limit,
      });
      return following.map((f) => f.following);
    }),

  isFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) return false;
      const follow = await ctx.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ctx.userId, followingId: input.userId } },
      });
      return !!follow;
    }),

  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const { headline, ...userFields } = input;

    await ctx.prisma.user.update({
      where: { id: ctx.userId },
      data: userFields,
    });

    if (headline !== undefined) {
      await ctx.prisma.profile.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId, headline },
        update: { headline },
      });
    }

    return { success: true };
  }),

  updateCustomCSS: protectedProcedure
    .input(updateCustomCSSSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Sanitization happens on write using our dedicated css service.
      const sanitizedCSS = sanitizeProfileCSS(input.customCSS) || '';

      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { customCSS: sanitizedCSS },
      });

      return { success: true };
    }),

  addExperience: protectedProcedure.input(addExperienceSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const profile = await ctx.prisma.profile.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId },
      update: {},
    });

    const experience = await ctx.prisma.experience.create({
      data: {
        ...input,
        profileId: profile.id,
      },
    });

    return experience;
  }),

  removeExperience: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const experience = await ctx.prisma.experience.findUnique({
        where: { id: input.id },
        include: { profile: true },
      });

      if (!experience || experience.profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.prisma.experience.delete({ where: { id: input.id } });
      return { success: true };
    }),

  addEducation: protectedProcedure.input(addEducationSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const profile = await ctx.prisma.profile.upsert({
      where: { userId: ctx.userId },
      create: { userId: ctx.userId },
      update: {},
    });

    const education = await ctx.prisma.education.create({
      data: {
        ...input,
        profileId: profile.id,
      },
    });

    return education;
  }),

  removeEducation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const education = await ctx.prisma.education.findUnique({
        where: { id: input.id },
        include: { profile: true },
      });

      if (!education || education.profile.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.prisma.education.delete({ where: { id: input.id } });
      return { success: true };
    }),

  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      if (ctx.userId === input.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot follow yourself' });
      }

      await ctx.prisma.$transaction(async (tx) => {
        // Create follow record
        await tx.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: ctx.userId,
              followingId: input.userId,
            },
          },
          create: {
            followerId: ctx.userId,
            followingId: input.userId,
          },
          update: {},
        });

        // Create notification for the user being followed
        // Check if a notification already exists from this user to prevent spam
        const existingNotif = await tx.notification.findFirst({
          where: {
            userId: input.userId,
            type: 'follow',
            data: { equals: { actorId: ctx.userId } },
          },
        });

        if (!existingNotif) {
          await tx.notification.create({
            data: {
              userId: input.userId,
              type: 'follow',
              data: { actorId: ctx.userId },
            },
          });
        }
      });

      return { success: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      await ctx.prisma.follow.deleteMany({
        where: {
          followerId: ctx.userId,
          followingId: input.userId,
        },
      });

      return { success: true };
    }),
});
