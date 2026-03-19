import { redis } from '@/lib/redis';

export function getUnreadNotificationCacheKey(userId: string): string {
  return `notif:unread:${userId}`;
}

export async function invalidateUnreadNotificationCache(userId: string): Promise<void> {
  await redis.del(getUnreadNotificationCacheKey(userId));
}
