import { describe, expect, it, vi } from 'vitest';
import { awardReputation, type ReputationReason } from '../reputation';

type MockUserDelegate = {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function createMockClient(initialReputation: number) {
  const user: MockUserDelegate = {
    findUnique: vi.fn().mockResolvedValue({ reputation: initialReputation }),
    update: vi.fn().mockResolvedValue(undefined),
  };

  return {
    user,
  };
}

describe('awardReputation', () => {
  it('floors reputation at 0', async () => {
    const prisma = createMockClient(1);

    await awardReputation(prisma as never, 'user_1', -10, 'post_downvoted');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { reputation: 0 },
    });
  });

  it.each([
    ['question_upvoted', 5],
    ['answer_upvoted', 10],
    ['answer_accepted', 15],
    ['post_downvoted', -2],
    ['answer_downvoted', -2],
  ] satisfies Array<[ReputationReason, number]>)(
    'applies the %s delta correctly',
    async (reason, delta) => {
      const prisma = createMockClient(20);

      await awardReputation(prisma as never, 'user_2', delta, reason);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_2' },
        data: { reputation: Math.max(0, 20 + delta) },
      });
    },
  );

  it('uses the transaction client when provided', async () => {
    const prisma = createMockClient(5);
    const tx = createMockClient(12);

    await awardReputation(prisma as never, 'user_3', 10, 'answer_upvoted', tx as never);

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_3' },
      select: { reputation: true },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user_3' },
      data: { reputation: 22 },
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
