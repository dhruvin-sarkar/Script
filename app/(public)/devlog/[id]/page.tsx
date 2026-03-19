import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return { title: "Not Found" };
  return { title: `${post.title || 'Devlog'} - Script` };
}

export default async function DevlogDetailPage({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id, type: "DEVLOG", deletedAt: null, privacy: "PUBLIC" },
    include: {
      author: { select: { username: true, displayName: true, avatar: true } },
      tags: { include: { tag: true } },
      statSnapshot: true,
    }
  });

  if (!post) {
    notFound();
  }

  return (
    <div className="container max-w-3xl py-10 mx-auto px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">{post.title || "Daily Devlog"}</h1>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm font-medium">
          <span className="text-foreground">{post.author.displayName || post.author.username}</span>
          <span>&middot;</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          {post.mood && (
            <>
              <span>&middot;</span>
              <span className="px-2.5 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                {post.mood}
              </span>
            </>
          )}
        </div>
      </div>
      
      <div className="prose prose-invert max-w-none mb-10 text-foreground/90 leading-relaxed">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.statSnapshot && (
        <div className="border border-border/50 rounded-xl p-6 bg-card/50 mt-8 shadow-sm">
          <h3 className="font-semibold mb-4 text-lg">WakaTime Stats for {new Date(post.statSnapshot.date).toLocaleDateString()}</h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{Math.floor(post.statSnapshot.totalSec / 3600)}h {Math.floor((post.statSnapshot.totalSec % 3600) / 60)}m</span>
            <span className="text-muted-foreground relative top-1">coded today</span>
          </div>
        </div>
      )}
    </div>
  );
}
