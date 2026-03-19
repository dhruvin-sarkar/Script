import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { 
  getGithubContributions, 
  getGithubRepos, 
  getGithubLanguageStats,
  getGithubAuthUrl
} from "../services/github";
import { redis } from "@/lib/redis";

export const githubRouter = router({
  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    return getGithubAuthUrl(ctx.userId);
  }),

  getContributions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const contributions = await getGithubContributions(input.userId);
      return contributions;
    }),

  getRepos: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const repos = await getGithubRepos(input.userId);
      return repos;
    }),

  getLanguageStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const stats = await getGithubLanguageStats(input.userId);
      return stats;
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.githubConnection.deleteMany({
      where: { userId: ctx.userId },
    });
    // Clear caches
    await redis.del(`github:${ctx.userId}:contributions`);
    await redis.del(`github:${ctx.userId}:repos`);
    await redis.del(`github:${ctx.userId}:languages`);
    
    return { success: true };
  })
});
