import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';

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
      })
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
});
