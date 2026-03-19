'use client';

import MDEditor from '@uiw/react-md-editor';
import { useUser } from '@clerk/nextjs';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface BlogEditorValue {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  seoTitle: string;
  seoDesc: string;
  coverImage: string;
  crossPostUrl: string;
  seriesId: string;
}

interface BlogEditorProps {
  mode: 'create' | 'edit';
  articleId?: string;
  initialValue?: Partial<BlogEditorValue>;
}

const DEFAULT_VALUE: BlogEditorValue = {
  title: '',
  content: '',
  excerpt: '',
  tags: [],
  seoTitle: '',
  seoDesc: '',
  coverImage: '',
  crossPostUrl: '',
  seriesId: '',
};

function getStorageKey(articleId?: string): string {
  return `script:blog-editor:${articleId ?? 'new'}`;
}

export function BlogEditor({ mode, articleId, initialValue }: BlogEditorProps) {
  const router = useRouter();
  const { user } = useUser();
  const [draft, setDraft] = useState<BlogEditorValue>(() => {
    const baseDraft: BlogEditorValue = {
      ...DEFAULT_VALUE,
      ...initialValue,
    };

    if (typeof window === 'undefined') {
      return baseDraft;
    }

    const saved = window.localStorage.getItem(getStorageKey(articleId));

    if (!saved) {
      return baseDraft;
    }

    try {
      const parsed = JSON.parse(saved) as BlogEditorValue;
      return parsed;
    } catch {
      window.localStorage.removeItem(getStorageKey(articleId));
      return baseDraft;
    }
  });
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userSeries = api.blog.getSeries.useQuery(
    { username: user?.username ?? '' },
    { enabled: Boolean(user?.username) },
  );
  const uploadMutation = api.upload.getPresignedUrl.useMutation();
  const createSeriesMutation = api.blog.createSeries.useMutation({
    onSuccess: () => {
      userSeries.refetch();
    },
  });
  const createMutation = api.blog.create.useMutation();
  const updateMutation = api.blog.update.useMutation();
  const publishMutation = api.blog.publish.useMutation();

  useEffect(() => {
    window.localStorage.setItem(getStorageKey(articleId), JSON.stringify(draft));
  }, [articleId, draft]);

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    uploadMutation.isPending;

  const seriesOptions = useMemo(() => userSeries.data ?? [], [userSeries.data]);

  const submitArticle = async (publishAfterSave: boolean) => {
    const payload = {
      title: draft.title,
      content: draft.content,
      excerpt: draft.excerpt || undefined,
      tags: draft.tags,
      seoTitle: draft.seoTitle || undefined,
      seoDesc: draft.seoDesc || undefined,
      coverImage: draft.coverImage || undefined,
      crossPostUrl: draft.crossPostUrl || undefined,
      seriesId: draft.seriesId || undefined,
    };

    if (mode === 'create') {
      const created = await createMutation.mutateAsync(payload);

      if (publishAfterSave) {
        await publishMutation.mutateAsync({ id: created.id });
      }

      window.localStorage.removeItem(getStorageKey(articleId));
      router.push('/blog/manage');
      return;
    }

    if (!articleId) {
      return;
    }

    await updateMutation.mutateAsync({
      id: articleId,
      ...payload,
      coverImage: draft.coverImage || null,
      crossPostUrl: draft.crossPostUrl || null,
      seriesId: draft.seriesId || null,
    });

    if (publishAfterSave) {
      await publishMutation.mutateAsync({ id: articleId });
    }

    window.localStorage.removeItem(getStorageKey(articleId));
    router.push('/blog/manage');
  };

  const handleCoverUpload = async (file: File) => {
    const upload = await uploadMutation.mutateAsync({
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      target: 'post-image',
    });

    const response = await fetch(upload.presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (response.ok) {
      setDraft((current) => ({ ...current, coverImage: upload.publicUrl }));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
        <Input
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          placeholder="Article title"
          className="h-12 text-lg font-semibold"
        />

        <div data-color-mode="dark">
          <MDEditor
            value={draft.content}
            onChange={(value) => setDraft((current) => ({ ...current, content: value ?? '' }))}
            preview="live"
            height={560}
          />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold tracking-[0.24em] text-[var(--text-muted)] uppercase">
            Settings
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Excerpt
              </label>
              <Textarea
                value={draft.excerpt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, excerpt: event.target.value }))
                }
                className="min-h-24"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Tags
              </label>
              <Input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Press Enter to add a tag"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const nextTag = tagInput.trim().toLowerCase();

                    if (nextTag && !draft.tags.includes(nextTag) && draft.tags.length < 5) {
                      setDraft((current) => ({ ...current, tags: [...current.tags, nextTag] }));
                      setTagInput('');
                    }
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs text-[var(--accent)]"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        tags: current.tags.filter((item) => item !== tag),
                      }))
                    }
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                SEO Title
              </label>
              <Input
                value={draft.seoTitle}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, seoTitle: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                SEO Description
              </label>
              <Textarea
                value={draft.seoDesc}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, seoDesc: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Cover Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleCoverUpload(file);
                  }
                }}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                {draft.coverImage ? 'Replace cover image' : 'Upload cover image'}
              </Button>
              {draft.coverImage ? (
                <img
                  src={draft.coverImage}
                  alt="Article cover preview"
                  className="mt-3 h-28 w-full rounded-2xl object-cover"
                />
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Series
              </label>
              <select
                value={draft.seriesId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, seriesId: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-3 text-sm"
              >
                <option value="">No series</option>
                {seriesOptions.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.title}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                className="mt-2 px-0 text-[var(--accent)]"
                onClick={() => {
                  const title = window.prompt('Series title');

                  if (title) {
                    createSeriesMutation.mutate({ title });
                  }
                }}
              >
                Create new series
              </Button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Cross-post URL
              </label>
              <Input
                value={draft.crossPostUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, crossPostUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs tracking-[0.24em] text-[var(--text-muted)] uppercase">Actions</p>
          <div className="mt-4 space-y-2">
            <Button className="w-full" disabled={isBusy} onClick={() => void submitArticle(false)}>
              Save Draft
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={isBusy}
              onClick={() => void submitArticle(true)}
            >
              Publish Article
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
