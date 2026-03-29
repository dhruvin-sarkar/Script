import { PostType, Privacy } from '@prisma/client';
import { prisma } from '../server/db';
import { getAdminSearchClient } from '../server/services/search';

interface PostSearchDocument {
  id: string;
  type: PostType;
  title: string | null;
  content: string;
  excerpt: string | null;
  slug: string | null;
  published: boolean;
  privacy: Privacy;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
  viewCount: number;
}

interface DevlogSearchDocument {
  id: string;
  type: 'DEVLOG';
  title: string | null;
  content: string;
  privacy: Privacy;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  tags: string[];
  createdAt: string;
}

interface UserSearchDocument {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function ensureIndex(uid: string): Promise<void> {
  const client = getAdminSearchClient();

  try {
    await client.getIndex(uid);
  } catch {
    await client.createIndex(uid, { primaryKey: 'id' }).waitTask();
  }
}

async function resetIndex(
  uid: string,
  settings: {
    searchableAttributes: string[];
    filterableAttributes?: string[];
    sortableAttributes?: string[];
  },
): Promise<void> {
  const client = getAdminSearchClient();
  const index = client.index(uid);

  await ensureIndex(uid);
  await index.updateSettings(settings).waitTask();
  await index.deleteAllDocuments().waitTask();
}

async function fetchPostDocuments(): Promise<PostSearchDocument[]> {
  const posts = await prisma.post.findMany({
    where: {
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  return posts.map((post) => ({
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
  }));
}

async function fetchDevlogDocuments(): Promise<DevlogSearchDocument[]> {
  const devlogs = await prisma.post.findMany({
    where: {
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  return devlogs.map((devlog) => ({
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
  }));
}

async function fetchUserDocuments(): Promise<UserSearchDocument[]> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
    },
    orderBy: {
      username: 'asc',
    },
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
  }));
}

async function indexDocuments<T extends { id: string }>(
  uid: string,
  documents: T[],
  batchSize = 250,
): Promise<void> {
  const client = getAdminSearchClient();
  const index = client.index<T>(uid);
  const batches = chunk(documents, batchSize);

  for (const [batchIndex, batch] of batches.entries()) {
    if (!batch.length) {
      continue;
    }

    await index.addDocuments(batch).waitTask();
    console.log(`[reindex] ${uid}: indexed batch ${batchIndex + 1}/${batches.length}`);
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`[reindex] started at ${new Date(startedAt).toISOString()}`);

  await Promise.all([
    resetIndex('posts', {
      searchableAttributes: [
        'title',
        'excerpt',
        'content',
        'authorUsername',
        'authorDisplayName',
        'tags',
      ],
      filterableAttributes: ['published', 'privacy', 'type'],
      sortableAttributes: ['createdAt', 'publishedAt', 'viewCount'],
    }),
    resetIndex('devlogs', {
      searchableAttributes: ['title', 'content', 'authorUsername', 'authorDisplayName', 'tags'],
      filterableAttributes: ['privacy'],
      sortableAttributes: ['createdAt'],
    }),
    resetIndex('users', {
      searchableAttributes: ['username', 'displayName', 'bio'],
    }),
  ]);

  const [postDocuments, devlogDocuments, userDocuments] = await Promise.all([
    fetchPostDocuments(),
    fetchDevlogDocuments(),
    fetchUserDocuments(),
  ]);

  console.log(
    `[reindex] fetched ${postDocuments.length} posts, ${devlogDocuments.length} devlogs, ${userDocuments.length} users`,
  );

  await indexDocuments('posts', postDocuments);
  await indexDocuments('devlogs', devlogDocuments);
  await indexDocuments('users', userDocuments);

  const durationMs = Date.now() - startedAt;
  console.log(`[reindex] completed in ${durationMs}ms`);
}

main()
  .catch((error) => {
    console.error('[reindex] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
