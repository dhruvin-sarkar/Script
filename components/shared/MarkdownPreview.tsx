'use client';

import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn('prose prose-invert max-w-none', className)} data-color-mode="dark">
      <MDEditor.Markdown
        source={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      />
    </div>
  );
}
