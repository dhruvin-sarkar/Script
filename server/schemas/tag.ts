import { z } from 'zod';

const tagSlugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Tags use lowercase letters, numbers, and hyphens only.');

export const listTagsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(24),
});

export const searchTagsSchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.number().min(1).max(50).default(24),
});

export const trendingTagsSchema = z.object({
  limit: z.number().min(1).max(20).default(8),
});

export const tagBySlugSchema = z.object({
  slug: tagSlugSchema,
});

export const tagFollowSchema = z.object({
  slug: tagSlugSchema,
});
