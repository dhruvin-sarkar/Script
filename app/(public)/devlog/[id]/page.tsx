import { prisma } from '@/server/db';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

type DevlogDetailPageParams = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: DevlogDetailPageParams;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id, type: 'DEVLOG', deletedAt: null, privacy: 'PUBLIC' },
    select: { title: true },
  });
  if (!post) return { title: 'Not Found' };
  return { title: `${post.title || 'Devlog'} - Script` };
}

export default async function DevlogDetailPage({ params }: { params: DevlogDetailPageParams }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id, type: 'DEVLOG', deletedAt: null, privacy: 'PUBLIC' },
    include: {
      author: { select: { username: true, displayName: true, avatar: true } },
      tags: { include: { tag: true } },
      statSnapshot: true,
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:px-0">
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{post.title || 'Daily Devlog'}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm font-medium">
          <span className="text-foreground">{post.author.displayName || post.author.username}</span>
          <span>&middot;</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          {post.mood && (
            <>
              <span>&middot;</span>
              <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5">
                {post.mood}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="prose prose-invert text-foreground/90 mb-10 max-w-none leading-relaxed">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.statSnapshot && (
        <div className="border-border/50 bg-card/50 mt-8 rounded-xl border p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            WakaTime Stats for {new Date(post.statSnapshot.date).toLocaleDateString()}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">
              {Math.floor(post.statSnapshot.totalSec / 3600)}h{' '}
              {Math.floor((post.statSnapshot.totalSec % 3600) / 60)}m
            </span>
            <span className="text-muted-foreground relative top-1">coded today</span>
          </div>
        </div>
      )}
    </div>
  );
}
