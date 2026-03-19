import { PostType } from '@prisma/client';
import { router, publicProcedure } from '../trpc';
import { searchQuerySchema } from '../schemas/search';
import { getSearchOnlyClient } from '../services/search';

const forumTypes = new Set(['QUESTION', 'DISCUSSION', 'SHOWCASE']);

interface SearchHit {
  id: string;
  type?: string;
  title?: string | null;
  content?: string | null;
  excerpt?: string | null;
  slug?: string | null;
  username?: string;
  displayName?: string | null;
  authorUsername?: string;
  authorDisplayName?: string | null;
  tags?: string[];
  createdAt?: string;
  publishedAt?: string | null;
  viewCount?: number;
  privacy?: string;
  published?: boolean;
}

function emptySearchResult() {
  return {
    hits: [] as SearchHit[],
    estimatedTotalHits: 0,
    processingTimeMs: 0,
  };
}

export const searchRouter = router({
  query: publicProcedure.input(searchQuerySchema).query(async ({ input }) => {
    try {
      const client = getSearchOnlyClient();
      const offset = (input.page - 1) * input.limit;

      const [postsResult, devlogsResult, usersResult] = await Promise.all([
        input.types.includes('posts')
          ? client.index<SearchHit>('posts').search(input.q, {
              filter: ['published = true'],
              limit: input.limit,
              offset,
            })
          : Promise.resolve(emptySearchResult()),
        input.types.includes('devlogs')
          ? client.index<SearchHit>('devlogs').search(input.q, {
              filter: ['privacy = PUBLIC'],
              limit: input.limit,
              offset,
            })
          : Promise.resolve(emptySearchResult()),
        input.types.includes('users')
          ? client.index<SearchHit>('users').search(input.q, {
              limit: input.limit,
              offset,
            })
          : Promise.resolve(emptySearchResult()),
      ]);

      const posts = postsResult.hits.filter((hit) => hit.type === PostType.ARTICLE);
      const forumPosts = postsResult.hits.filter(
        (hit) => typeof hit.type === 'string' && forumTypes.has(hit.type),
      );

      return {
        posts,
        forum: forumPosts,
        devlogs: devlogsResult.hits,
        users: usersResult.hits,
        totalHits:
          postsResult.estimatedTotalHits +
          devlogsResult.estimatedTotalHits +
          usersResult.estimatedTotalHits,
        processingTimeMs:
          postsResult.processingTimeMs +
          devlogsResult.processingTimeMs +
          usersResult.processingTimeMs,
      };
    } catch (error) {
      console.error('[search] search query failed', { error, query: input.q });

      return {
        posts: [] as SearchHit[],
        forum: [] as SearchHit[],
        devlogs: [] as SearchHit[],
        users: [] as SearchHit[],
        totalHits: 0,
        processingTimeMs: 0,
      };
    }
  }),
});
