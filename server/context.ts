import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

export async function createContext() {
  const { userId: clerkId } = await auth();

  let userId: string | null = null;

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
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
