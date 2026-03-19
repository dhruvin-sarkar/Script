import { ReactionType } from '@prisma/client';
import { z } from 'zod';

export const createBlogSchema = z.object({
  title: z.string().min(5).max(300),
  content: z.string().min(20).max(50000),
  excerpt: z.string().max(300).optional(),
  tags: z.array(z.string().min(1).max(50)).max(5).default([]),
  seoTitle: z.string().max(300).optional(),
  seoDesc: z.string().max(300).optional(),
  coverImage: z.string().url().optional(),
  crossPostUrl: z.string().url().optional(),
  seriesId: z.string().cuid().optional(),
});

export const updateBlogSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).max(300).optional(),
  content: z.string().min(20).max(50000).optional(),
  excerpt: z.string().max(300).optional(),
  tags: z.array(z.string().min(1).max(50)).max(5).optional(),
  seoTitle: z.string().max(300).optional(),
  seoDesc: z.string().max(300).optional(),
  coverImage: z.string().url().nullable().optional(),
  crossPostUrl: z.string().url().nullable().optional(),
  seriesId: z.string().cuid().nullable().optional(),
});

export const togglePublishSchema = z.object({
  id: z.string().cuid(),
});

export const deleteBlogSchema = z.object({
  id: z.string().cuid(),
});

export const getBlogBySlugSchema = z.object({
  username: z.string().min(1),
  slug: z.string().min(1),
});

export const getBlogsByUserSchema = z.object({
  username: z.string().min(1),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  status: z.enum(['all', 'draft', 'published']).default('published'),
});

export const getBlogFeedSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  sort: z.enum(['latest', 'most-viewed']).default('latest'),
});

export const incrementBlogViewsSchema = z.object({
  postId: z.string().cuid(),
});

export const reactToBlogSchema = z.object({
  postId: z.string().cuid(),
  reaction: z.nativeEnum(ReactionType),
});

export const createSeriesSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
});

export const getSeriesSchema = z.object({
  username: z.string().min(1),
  seriesId: z.string().cuid().optional(),
});
