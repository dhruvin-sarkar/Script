import { MeiliSearch } from 'meilisearch';
import { redis } from '@/lib/redis';

export type SearchSyncIndex = 'posts' | 'devlogs' | 'users';

export interface SearchSyncItem {
  op: 'upsert' | 'delete';
  docId: string;
  index: SearchSyncIndex;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getAdminSearchClient(): MeiliSearch {
  return new MeiliSearch({
    host: requireEnv('MEILISEARCH_URL', process.env.MEILISEARCH_URL),
    apiKey: requireEnv('MEILISEARCH_API_KEY', process.env.MEILISEARCH_API_KEY),
  });
}

export function getSearchOnlyClient(): MeiliSearch {
  return new MeiliSearch({
    host: requireEnv('MEILISEARCH_URL', process.env.MEILISEARCH_URL),
    apiKey: requireEnv(
      'NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY',
      process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY,
    ),
  });
}

export async function queueSearchSync(item: SearchSyncItem): Promise<void> {
  await redis.rpush('search:sync:queue', JSON.stringify(item));
}
