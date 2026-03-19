import type { PrismaClient, Prisma } from '@prisma/client';

export type ReputationReason =
  | 'question_upvoted'
  | 'answer_upvoted'
  | 'answer_accepted'
  | 'post_downvoted'
  | 'answer_downvoted';

type ReputationClient = PrismaClient | Prisma.TransactionClient;

export async function awardReputation(
  prisma: PrismaClient,
  userId: string,
  delta: number,
  reason: ReputationReason,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client: ReputationClient = tx ?? prisma;

  try {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { reputation: true },
    });

    if (!user) {
      return;
    }

    const newValue = Math.max(0, user.reputation + delta);

    await client.user.update({
      where: { id: userId },
      data: { reputation: newValue },
    });

    console.log(`[reputation] userId=${userId} delta=${delta} reason=${reason}`);
  } catch (error) {
    console.error('[reputation] failed to update reputation', {
      userId,
      delta,
      reason,
      error,
    });
  }
}
