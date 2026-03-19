import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

interface CreateContextOptions {
  req?: Request;
}

export async function createContext(options?: CreateContextOptions) {
  const { userId: clerkId } = await auth();

  let userId: string | null = null;
  const forwardedFor = options?.req?.headers.get('x-forwarded-for') ?? null;
  const ip = forwardedFor?.split(',')[0]?.trim() || options?.req?.headers.get('x-real-ip') || null;

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  return {
    prisma,
    userId,
    clerkId,
    ip,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
