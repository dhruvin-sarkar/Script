import { BlogEditor } from '@/components/editor/BlogEditor';

export default function NewBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">New Article</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Draft first, publish when it’s ready.
        </p>
      </div>
      <BlogEditor mode="create" />
    </div>
  );
}
