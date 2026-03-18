import Link from 'next/link';

export function DevlogCard({ post }: { post: any }) {
  return (
    <Link href={`/devlog/${post.id}`} className="block border border-border/50 rounded-xl p-5 bg-card text-card-foreground hover:bg-muted/50 transition-colors shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-foreground/70 font-medium">
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        {post.mood && (
          <span className="text-xs font-semibold px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
            {post.mood}
          </span>
        )}
      </div>
      <p className="text-base line-clamp-3 text-foreground/90 leading-relaxed mb-4">{post.content}</p>
      
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {post.tags.map((t: any) => (
            <span key={t.tag.name} className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
              #{t.tag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
