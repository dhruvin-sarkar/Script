import { PostType, Privacy } from '@prisma/client';
import { prisma } from '@/server/db';
import { redis } from '@/lib/redis';
import { getAdminSearchClient, type SearchSyncItem } from './search';

interface SearchDocument {
  id: string;
  type?: string;
  title?: string | null;
  content?: string | null;
  excerpt?: string | null;
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  published?: boolean;
  privacy?: string;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string | null;
  tags?: string[];
  slug?: string | null;
  createdAt?: string;
  publishedAt?: string | null;
  viewCount?: number;
}

async function getPostDocument(docId: string): Promise<SearchDocument | null> {
  const post = await prisma.post.findFirst({
    where: {
      id: docId,
      deletedAt: null,
      OR: [
        {
          type: PostType.ARTICLE,
          published: true,
          privacy: Privacy.PUBLIC,
        },
        {
          type: {
            in: [PostType.QUESTION, PostType.DISCUSSION, PostType.SHOWCASE],
          },
          privacy: Privacy.PUBLIC,
        },
      ],
    },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      excerpt: true,
      slug: true,
      published: true,
      privacy: true,
      authorId: true,
      createdAt: true,
      publishedAt: true,
      viewCount: true,
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    slug: post.slug,
    published: post.type === PostType.ARTICLE ? post.published : true,
    privacy: post.privacy,
    authorId: post.authorId,
    authorUsername: post.author.username,
    authorDisplayName: post.author.displayName,
    tags: post.tags.map((tag) => tag.tag.name),
    createdAt: post.createdAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    viewCount: post.viewCount,
  };
}

async function getDevlogDocument(docId: string): Promise<SearchDocument | null> {
  const devlog = await prisma.post.findFirst({
    where: {
      id: docId,
      type: PostType.DEVLOG,
      privacy: Privacy.PUBLIC,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      privacy: true,
      authorId: true,
      createdAt: true,
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!devlog) {
    return null;
  }

  return {
    id: devlog.id,
    type: PostType.DEVLOG,
    title: devlog.title,
    content: devlog.content,
    privacy: devlog.privacy,
    authorId: devlog.authorId,
    authorUsername: devlog.author.username,
    authorDisplayName: devlog.author.displayName,
    tags: devlog.tags.map((tag) => tag.tag.name),
    createdAt: devlog.createdAt.toISOString(),
  };
}

async function getUserDocument(docId: string): Promise<SearchDocument | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: docId,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      reputation: true,
      avatar: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
  };
}

async function resolveDocument(item: SearchSyncItem): Promise<SearchDocument | null> {
  if (item.index === 'posts') {
    return getPostDocument(item.docId);
  }

  if (item.index === 'devlogs') {
    return getDevlogDocument(item.docId);
  }

  return getUserDocument(item.docId);
}

export async function processSyncQueue(maxItems = 50): Promise<void> {
  const client = getAdminSearchClient();
  let processed = 0;

  for (let index = 0; index < maxItems; index += 1) {
    const rawItem = await redis.lpop<string>('search:sync:queue');

    if (!rawItem) {
      break;
    }

    try {
      const item = JSON.parse(rawItem) as SearchSyncItem;

      if (item.op === 'delete') {
        await client.index(item.index).deleteDocument(item.docId);
        processed += 1;
        continue;
      }

      const document = await resolveDocument(item);

      if (!document) {
        await client.index(item.index).deleteDocument(item.docId);
        processed += 1;
        continue;
      }

      await client.index(item.index).addDocuments([document]);
      processed += 1;
    } catch (error) {
      console.error('[search-sync] failed to process item', { rawItem, error });
    }
  }

  console.log(`Synced ${processed} items to Meilisearch`);
}
