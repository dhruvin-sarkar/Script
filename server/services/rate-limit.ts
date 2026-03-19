import { TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

export const rateLimiters = {
  blogCreate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 d'),
  }),
  blogReact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
  }),
  forumCreateThread: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 d'),
  }),
  forumCreateAnswer: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'),
  }),
  forumVote: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
  }),
};

export async function enforceRateLimit(
  limiter: Ratelimit,
  identifier: string,
  message = 'Rate limit exceeded. Please try again later.',
): Promise<void> {
  const result = await limiter.limit(identifier);

  if (!result.success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message,
    });
  }
}
