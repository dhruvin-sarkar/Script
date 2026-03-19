'use client';

import MDEditor from '@uiw/react-md-editor';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@clerk/nextjs';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createThreadSchema } from '@/server/schemas/forum';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';

const askQuestionSchema = createThreadSchema.extend({
  title: z.string().min(15).max(300),
});

type AskQuestionFormInput = z.input<typeof askQuestionSchema>;
type AskQuestionFormValue = z.output<typeof askQuestionSchema>;

const LOCAL_STORAGE_KEY = 'script:forum-draft';

export default function AskQuestionPage() {
  const router = useRouter();
  const { user } = useUser();
  const [tagInput, setTagInput] = useState('');
  const [devlogSearch, setDevlogSearch] = useState('');
  const [linkDevlog, setLinkDevlog] = useState(false);
  const [titleForLookup, setTitleForLookup] = useState('');

  const profileQuery = api.user.getProfile.useQuery(
    { username: user?.username ?? '' },
    { enabled: Boolean(user?.username) },
  );
  const devlogsQuery = api.devlog.getByUser.useQuery(
    {
      authorId: profileQuery.data?.id ?? '',
      limit: 20,
    },
    { enabled: Boolean(profileQuery.data?.id) },
  );
  const similarTitlesQuery = api.forum.checkSimilarTitles.useQuery(
    { title: titleForLookup },
    { enabled: titleForLookup.trim().length >= 8 },
  );
  const createThread = api.forum.createThread.useMutation({
    onSuccess: (thread) => {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      router.push(`/forum/${thread.id}`);
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AskQuestionFormInput, undefined, AskQuestionFormValue>({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: {
      title: '',
      content: '',
      type: 'QUESTION',
      tags: [],
      devlogId: undefined,
    },
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);

    if (raw) {
      try {
        reset(JSON.parse(raw) as AskQuestionFormValue);
      } catch {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, [reset]);

  const values = watch();
  const tags = values.tags ?? [];

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTitleForLookup(values.title), 400);
    return () => window.clearTimeout(timeout);
  }, [values.title]);

  const filteredDevlogs = useMemo(() => {
    const items = devlogsQuery.data?.items ?? [];
    const query = devlogSearch.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((devlog) =>
      `${devlog.title ?? ''} ${devlog.content}`.toLowerCase().includes(query),
    );
  }, [devlogSearch, devlogsQuery.data?.items]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Ask a Question</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Be specific. Describe what you&apos;ve tried. Link your devlog for context.
        </p>
      </div>

      <form
        className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
        onSubmit={handleSubmit((data) => createThread.mutate(data))}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            Question title
          </label>
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input {...field} placeholder="How do I...? What is the best way to...?" />
            )}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{values.title.length}/300</span>
            {errors.title ? <span>{errors.title.message}</span> : null}
          </div>
          {similarTitlesQuery.data?.length ? (
            <p className="mt-2 text-xs text-[var(--warning)]">
              Similar threads:{' '}
              {similarTitlesQuery.data
                .map((thread) => thread.title)
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Type</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Question', value: 'QUESTION' },
              { label: 'Discussion', value: 'DISCUSSION' },
              { label: 'Showcase', value: 'SHOWCASE' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition-colors',
                  values.type === option.value
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
                )}
                onClick={() => setValue('type', option.value as AskQuestionFormValue['type'])}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
            {values.type === 'SHOWCASE' ? 'What did you build?' : 'Details'}
          </label>
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <div data-color-mode="dark">
                <MDEditor {...field} value={field.value} height={320} />
              </div>
            )}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Tags</label>
          <Input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="Add up to 5 tags"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const nextTag = tagInput.trim().toLowerCase();

                if (nextTag && !tags.includes(nextTag) && tags.length < 5) {
                  setValue('tags', [...tags, nextTag]);
                  setTagInput('');
                }
              }
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-xs text-[var(--accent)]"
                onClick={() =>
                  setValue(
                    'tags',
                    tags.filter((item) => item !== tag),
                  )
                }
              >
                #{tag} ×
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['typescript', 'react', 'nextjs', 'prisma', 'trpc'].map((tag) => (
              <button
                key={tag}
                type="button"
                className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                onClick={() => {
                  if (!tags.includes(tag) && tags.length < 5) {
                    setValue('tags', [...tags, tag]);
                  }
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] p-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={linkDevlog}
              onChange={(event) => setLinkDevlog(event.target.checked)}
            />
            Link a devlog for context
          </label>

          {linkDevlog ? (
            <div className="mt-4 space-y-3">
              <Input
                value={devlogSearch}
                onChange={(event) => setDevlogSearch(event.target.value)}
                placeholder="Search your devlogs"
              />
              <div className="space-y-2">
                {filteredDevlogs.map((devlog) => (
                  <button
                    key={devlog.id}
                    type="button"
                    className={cn(
                      'block w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                      values.devlogId === devlog.id
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                        : 'border-[var(--border)] bg-[var(--bg-base)]',
                    )}
                    onClick={() => setValue('devlogId', devlog.id)}
                  >
                    <p className="font-medium text-[var(--text-primary)]">
                      {devlog.title ?? 'Untitled devlog'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {devlog.logDate
                        ? new Date(devlog.logDate).toLocaleDateString()
                        : 'No log date'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={createThread.isPending}>
            Post Question
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values))}
          >
            Save Draft
          </Button>
          <Link href="/forum" className="text-sm text-[var(--text-secondary)]">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
