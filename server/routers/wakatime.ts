import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

import { 
  getWakatimeAuthUrl, 
  getWakatimeStats, 
  getWakatimeSnapshotForDate 
} from "../services/wakatime";
import { redis } from "@/lib/redis";

export const wakatimeRouter = router({
  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    const url = await getWakatimeAuthUrl(ctx.userId);
    return { url };
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getWakatimeStats(ctx.userId);
    return stats;
  }),
  
  getSnapshotForDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const stat = await getWakatimeSnapshotForDate(ctx.userId, input.date);
      return stat;
    }),
    
  getLiveStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await redis.get<string>(`${ctx.userId}_live`);
    return { isLive: status === "true" };
  }),
  
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.wakatimeConnection.deleteMany({
      where: { userId: ctx.userId },
    });
    // Clear caches
    await redis.del(`wakatime:${ctx.userId}:stats`);
    const keys = await redis.keys(`wakatime:${ctx.userId}:date:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return { success: true };
  })
});
