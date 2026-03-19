import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export type SerializedMarkdown = MDXRemoteSerializeResult<Record<string, unknown>>;

export async function serializeMarkdown(markdown: string): Promise<SerializedMarkdown> {
  return serialize(markdown, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSanitize,
        [
          rehypePrettyCode,
          {
            theme: 'github-dark-default',
            keepBackground: false,
          },
        ],
      ],
    },
    parseFrontmatter: false,
  });
}
