import type { PrismaClient, Prisma } from '@prisma/client';

type TagClient = PrismaClient | Prisma.TransactionClient;

export function normalizeTagNames(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.toLowerCase()),
    ),
  ).slice(0, 5);
}

function createTagRecord(tag: string) {
  return {
    tag: {
      connectOrCreate: {
        where: { slug: tag },
        create: {
          name: tag,
          slug: tag,
        },
      },
    },
  };
}

export function buildTagCreateData(tags: string[]) {
  return normalizeTagNames(tags).map(createTagRecord);
}

export async function replacePostTags(
  client: TagClient,
  postId: string,
  tags: string[],
): Promise<void> {
  await client.postTag.deleteMany({
    where: { postId },
  });

  const normalizedTags = normalizeTagNames(tags);

  if (normalizedTags.length === 0) {
    return;
  }

  await client.post.update({
    where: { id: postId },
    data: {
      tags: {
        create: normalizedTags.map(createTagRecord),
      },
    },
  });
}
