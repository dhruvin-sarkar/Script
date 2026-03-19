import type { Metadata } from 'next';
import { BlogArticleClient } from '@/components/post/BlogArticleClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/Avatar';
import { createContext } from '@/server/context';
import { appRouter } from '@/server/routers/_app';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Clock3, Eye } from 'lucide-react';

interface BlogArticlePageProps {
  params: Promise<{ username: string; slug: string }>;
}

async function getArticle(username: string, slug: string) {
  const context = await createContext();
  const caller = appRouter.createCaller(context);
  const article = await caller.blog.getBySlug({ username, slug });
  return { article, context };
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { username, slug } = await params;

  try {
    const { article } = await getArticle(username, slug);
    return {
      title: article.seoTitle ?? article.title ?? 'Article',
      description: article.seoDesc ?? article.excerpt ?? undefined,
    };
  } catch {
    return {
      title: 'Article not found — Script',
    };
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { username, slug } = await params;

  try {
    const { article, context } = await getArticle(username, slug);
    const seriesPosts = article.series?.posts ?? [];
    const currentIndex = seriesPosts.findIndex((post) => post.id === article.id);
    const previousPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
    const nextPost =
      currentIndex >= 0 && currentIndex < seriesPosts.length - 1
        ? seriesPosts[currentIndex + 1]
        : null;

    return (
      <div className="mx-auto max-w-4xl space-y-8">
        {article.crossPostUrl ? (
          <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-4 py-3 text-sm text-[var(--text-primary)]">
            Cross-posted from{' '}
            <a
              href={article.crossPostUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)]"
            >
              {article.crossPostUrl}
            </a>
          </div>
        ) : null}

        <header className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag.tag.slug}
                className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs font-medium text-[var(--accent)]"
              >
                #{tag.tag.name}
              </span>
            ))}
          </div>

          <h1 className="text-4xl leading-tight font-semibold text-[var(--text-primary)]">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <span>@{article.author.username}</span>
            {article.publishedAt ? (
              <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              {article.readingTime ?? 1} min read
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.viewCount} views
            </span>
          </div>

          {article.coverImage ? (
            <div className="overflow-hidden rounded-3xl border border-[var(--border)]">
              <img
                src={article.coverImage}
                alt={article.title ?? 'Article cover'}
                className="h-[320px] w-full object-cover"
              />
            </div>
          ) : null}
        </header>

        <BlogArticleClient
          postId={article.id}
          currentUserId={context.userId}
          initialReactions={article.reactions}
        />

        <article className="prose prose-invert max-w-none rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-8">
          <MDXRemote
            source={article.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSanitize,
                  [
                    rehypePrettyCode,
                    {
                      theme: 'github-dark-default',
                      keepBackground: false,
                    },
                  ],
                ],
              },
            }}
          />
        </article>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={article.author.avatar ?? undefined} alt={article.author.username} />
              <AvatarFallback>{article.author.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {article.author.displayName ?? article.author.username}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">@{article.author.username}</p>
            </div>
          </div>
          {article.author.bio ? (
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              {article.author.bio}
            </p>
          ) : null}
        </section>

        {article.series ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs font-semibold tracking-[0.24em] text-[var(--text-muted)] uppercase">
              Series Navigator
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Previous</p>
                {previousPost ? (
                  <Link
                    href={`/blog/${username}/${previousPost.slug}`}
                    className="text-[var(--accent)]"
                  >
                    {previousPost.title}
                  </Link>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Start of series</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Next</p>
                {nextPost ? (
                  <Link
                    href={`/blog/${username}/${nextPost.slug}`}
                    className="text-[var(--accent)]"
                  >
                    {nextPost.title}
                  </Link>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">End of series</p>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  } catch {
    notFound();
  }
}
