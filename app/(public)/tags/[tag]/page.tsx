import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TagDetailClient } from '@/components/shared/TagDetailClient';
import { createContext } from '@/server/context';
import { prisma } from '@/server/db';
import { appRouter } from '@/server/routers/_app';

interface TagDetailPageProps {
  params: Promise<{ tag: string }>;
}

const getPublicTag = cache(async (slug: string) => {
  const caller = appRouter.createCaller({
    prisma,
    userId: null,
    clerkId: null,
    ip: null,
  });

  return caller.tag.getBySlug({ slug });
});

const getViewerTag = cache(async (slug: string) => {
  const caller = appRouter.createCaller(await createContext());
  return caller.tag.getBySlug({ slug });
});

export async function generateMetadata({ params }: TagDetailPageProps): Promise<Metadata> {
  const { tag } = await params;

  try {
    const tagData = await getPublicTag(tag);
    return {
      title: `#${tagData.name} - Script`,
      description:
        tagData.description ??
        `Browse public devlogs, articles, and forum threads tagged with ${tagData.name}.`,
    };
  } catch {
    return {
      title: 'Tag not found - Script',
    };
  }
}

export default async function TagDetailPage({ params }: TagDetailPageProps) {
  const { tag } = await params;
  let initialTag;

  try {
    initialTag = await getViewerTag(tag);
  } catch {
    notFound();
  }

  return <TagDetailClient initialTag={initialTag} slug={tag} />;
}
