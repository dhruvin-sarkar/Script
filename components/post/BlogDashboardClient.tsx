'use client';

import { api } from '@/app/providers';
import { BlogCard, BlogCardSkeleton } from '@/components/post/BlogCard';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';

type BlogStatus = 'all' | 'draft' | 'published';

export function BlogDashboardClient() {
  const { user } = useUser();
  const [status, setStatus] = useState<BlogStatus>('draft');
  const [page, setPage] = useState(1);
  const query = api.blog.getByUser.useQuery(
    {
      username: user?.username ?? '',
      page,
      limit: 20,
      status,
    },
    { enabled: Boolean(user?.username) },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Your Articles</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage drafts and published articles.
          </p>
        </div>
        <Link href="/blog/new">
          <Button>New Article</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {(['draft', 'published'] as const).map((tab) => (
          <Button
            key={tab}
            variant={status === tab ? 'default' : 'outline'}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
          >
            {tab === 'draft' ? 'Drafts' : 'Published'}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <BlogCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {(query.data?.items ?? []).map((article) => (
            <div key={article.id} className="space-y-3">
              <BlogCard
                id={article.id}
                username={article.author.username}
                slug={article.slug ?? ''}
                title={article.title ?? 'Untitled article'}
                excerpt={article.excerpt}
                coverImage={article.coverImage}
                readingTime={article.readingTime}
                publishedAt={article.publishedAt}
                viewCount={article.viewCount}
                tags={article.tags.map((tag) => tag.tag)}
              />
              <Link href={`/blog/${article.id}/edit`} className="text-sm text-[var(--accent)]">
                Edit article
              </Link>
            </div>
          ))}
        </div>
      )}

      {query.data?.hasMore ? (
        <div className="text-center">
          <Button variant="outline" onClick={() => setPage((current) => current + 1)}>
            Load More
          </Button>
        </div>
      ) : null}
    </div>
  );
}
