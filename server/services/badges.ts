import type { PrismaClient } from '@prisma/client';
import { invalidateUnreadNotificationCache } from './notifications';

export const BADGE_SLUGS = {
  FIRST_DEVLOG: 'first-devlog',
  STREAK_7: 'streak-7',
  STREAK_30: 'streak-30',
  CENTURY_CLUB: '100-hours',
  FIRST_ANSWER: 'first-answer',
  TOP_CONTRIBUTOR: 'top-contributor',
  FIRST_QUESTION: 'first-question',
} as const;

export type BadgeCheckEvent =
  | { type: 'devlog_created'; totalDevlogs: number; streak: number }
  | { type: 'answer_accepted'; totalAccepted: number }
  | { type: 'hours_logged'; totalHours: number }
  | { type: 'question_created'; totalQuestions: number };

async function awardBadgeBySlug(prisma: PrismaClient, userId: string, slug: string): Promise<void> {
  const badge = await prisma.badge.findUnique({
    where: { slug },
    select: { id: true, name: true, icon: true },
  });

  if (!badge) {
    return;
  }

  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id,
      },
    },
  });

  if (existing) {
    return;
  }

  await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'badge',
      data: {
        badgeId: badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon,
      },
    },
  });

  await invalidateUnreadNotificationCache(userId);
}

export async function checkAndAwardBadges(
  prisma: PrismaClient,
  userId: string,
  event: BadgeCheckEvent,
): Promise<void> {
  try {
    const slugsToAward = new Set<string>();

    if (event.type === 'devlog_created') {
      if (event.totalDevlogs === 1) {
        slugsToAward.add(BADGE_SLUGS.FIRST_DEVLOG);
      }
      if (event.streak >= 7) {
        slugsToAward.add(BADGE_SLUGS.STREAK_7);
      }
      if (event.streak >= 30) {
        slugsToAward.add(BADGE_SLUGS.STREAK_30);
      }
    }

    if (event.type === 'answer_accepted') {
      if (event.totalAccepted === 1) {
        slugsToAward.add(BADGE_SLUGS.FIRST_ANSWER);
      }
      if (event.totalAccepted >= 10) {
        slugsToAward.add(BADGE_SLUGS.TOP_CONTRIBUTOR);
      }
    }

    if (event.type === 'hours_logged' && event.totalHours >= 100) {
      slugsToAward.add(BADGE_SLUGS.CENTURY_CLUB);
    }

    if (event.type === 'question_created' && event.totalQuestions === 1) {
      slugsToAward.add(BADGE_SLUGS.FIRST_QUESTION);
    }

    for (const slug of slugsToAward) {
      await awardBadgeBySlug(prisma, userId, slug);
    }
  } catch (error) {
    console.error('[badges] failed to check badges', { userId, event, error });
  }
}
