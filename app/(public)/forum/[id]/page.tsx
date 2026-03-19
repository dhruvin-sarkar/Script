import type { Metadata } from 'next';
import { ForumThreadClient } from '@/components/forum/ForumThreadClient';
import { createContext } from '@/server/context';
import { prisma } from '@/server/db';
import { appRouter } from '@/server/routers/_app';
import { notFound } from 'next/navigation';

interface ForumThreadPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ForumThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  const caller = appRouter.createCaller(await createContext());

  try {
    const data = await caller.forum.getThread({ id, answersPage: 1 });
    return {
      title: `${data.thread.title ?? 'Forum'} — Script Forum`,
    };
  } catch {
    return {
      title: 'Thread not found — Script Forum',
    };
  }
}

export default async function ForumThreadPage({ params }: ForumThreadPageProps) {
  const { id } = await params;
  const context = await createContext();
  const caller = appRouter.createCaller(context);

  let data: Awaited<ReturnType<typeof caller.forum.getThread>>;
  let similarThreads: Array<{ id: string; title: string | null }>;

  try {
    data = await caller.forum.getThread({ id, answersPage: 1 });
    similarThreads = data.thread.tags.length
      ? await prisma.post.findMany({
          where: {
            id: { not: id },
            deletedAt: null,
            tags: {
              some: {
                tag: {
                  slug: {
                    in: data.thread.tags.map((tag) => tag.slug),
                  },
                },
              },
            },
          },
          take: 4,
          select: {
            id: true,
            title: true,
          },
        })
      : [];
  } catch {
    notFound();
  }

  return (
    <ForumThreadClient
      initialData={data}
      currentUserId={context.userId}
      similarThreads={similarThreads}
    />
  );
}
