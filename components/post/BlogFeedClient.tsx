'use client';

import { api } from '@/app/providers';
import { BlogCard, BlogCardSkeleton } from '@/components/post/BlogCard';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function BlogFeedClient() {
  const [sort, setSort] = useState<'latest' | 'most-viewed'>('latest');
  const [page, setPage] = useState(1);
  const query = api.blog.getFeed.useQuery({
    page,
    limit: 20,
    sort,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Articles</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Long-form writing from the Script community.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sort === 'latest' ? 'default' : 'outline'}
            onClick={() => {
              setSort('latest');
              setPage(1);
            }}
          >
            Latest
          </Button>
          <Button
            variant={sort === 'most-viewed' ? 'default' : 'outline'}
            onClick={() => {
              setSort('most-viewed');
              setPage(1);
            }}
          >
            Most Viewed
          </Button>
        </div>
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
            <BlogCard
              key={article.id}
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
