import type { PrismaClient, Prisma } from '@prisma/client';

interface GenerateUniqueSlugOptions {
  authorId?: string;
  excludePostId?: string;
}

type SlugClient = PrismaClient | Prisma.TransactionClient;

export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'untitled';
}

export async function generateUniqueSlug(
  prisma: SlugClient,
  input: string,
  options: GenerateUniqueSlugOptions = {},
): Promise<string> {
  const baseSlug = slugify(input);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.post.findFirst({
      where: {
        slug: candidate,
        type: 'ARTICLE',
        deletedAt: null,
        ...(options.authorId ? { authorId: options.authorId } : {}),
        ...(options.excludePostId ? { id: { not: options.excludePostId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
