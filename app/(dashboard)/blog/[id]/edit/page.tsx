import { BlogEditor } from '@/components/editor/BlogEditor';
import { createContext } from '@/server/context';
import { prisma } from '@/server/db';
import { notFound } from 'next/navigation';
import { PostType } from '@prisma/client';

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params;
  const context = await createContext();

  if (!context.userId) {
    notFound();
  }

  const article = await prisma.post.findFirst({
    where: {
      id,
      authorId: context.userId,
      type: PostType.ARTICLE,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      coverImage: true,
      seoTitle: true,
      seoDesc: true,
      crossPostUrl: true,
      seriesId: true,
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

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Edit Article</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Update your draft and publish when you’re ready.
        </p>
      </div>
      <BlogEditor
        mode="edit"
        articleId={article.id}
        initialValue={{
          title: article.title ?? '',
          content: article.content,
          excerpt: article.excerpt ?? '',
          coverImage: article.coverImage ?? '',
          seoTitle: article.seoTitle ?? '',
          seoDesc: article.seoDesc ?? '',
          crossPostUrl: article.crossPostUrl ?? '',
          seriesId: article.seriesId ?? '',
          tags: article.tags.map((tag) => tag.tag.name),
        }}
      />
    </div>
  );
}
