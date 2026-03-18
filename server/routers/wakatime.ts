import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const wakatimeRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // To be implemented: fetch and cache current week stats from WakaTime API
    return null;
  }),
  
  getSnapshotForDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      // To be implemented: fetch specific date snapshot from DailyStat
      const stat = await ctx.prisma.dailyStat.findFirst({
        where: {
          userId: ctx.userId,
          date: {
            gte: new Date(input.date),
            lt: new Date(new Date(input.date).getTime() + 24 * 60 * 60 * 1000),
          }
        }
      });
      return stat;
    }),
    
  getLiveStatus: protectedProcedure.query(async ({ ctx }) => {
    // To be implemented: check redis flag for live status
    return { isLive: false };
  }),
  
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.wakatimeConnection.deleteMany({
      where: { userId: ctx.userId },
    });
    return { success: true };
  })
});
