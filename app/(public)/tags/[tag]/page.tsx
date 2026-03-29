import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TagDetailClient } from '@/components/shared/TagDetailClient';
import { createContext } from '@/server/context';
import { appRouter } from '@/server/routers/_app';

interface TagDetailPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: TagDetailPageProps): Promise<Metadata> {
  const { tag } = await params;
  const caller = appRouter.createCaller(await createContext());

  try {
    const tagData = await caller.tag.getBySlug({ slug: tag });
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
  const caller = appRouter.createCaller(await createContext());
  let initialTag;

  try {
    initialTag = await caller.tag.getBySlug({ slug: tag });
  } catch {
    notFound();
  }

  return <TagDetailClient initialTag={initialTag} slug={tag} />;
}
