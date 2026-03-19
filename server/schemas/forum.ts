import { z } from 'zod';

export const createThreadSchema = z.object({
  title: z.string().min(5).max(300),
  content: z.string().min(20).max(50000),
  type: z.enum(['QUESTION', 'DISCUSSION', 'SHOWCASE']),
  tags: z.array(z.string().min(1).max(50)).max(5).default([]),
  devlogId: z.string().cuid().optional(),
});

export const getThreadSchema = z.object({
  id: z.string().cuid(),
  answersPage: z.number().min(1).default(1),
});

export const forumFeedSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  type: z.enum(['QUESTION', 'DISCUSSION', 'SHOWCASE', 'all']).default('all'),
  filter: z.enum(['latest', 'unanswered', 'hot', 'my-tags']).default('latest'),
  tag: z.string().optional(),
});

export const updateThreadSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).max(300).optional(),
  content: z.string().min(20).max(50000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(5).optional(),
});

export const deleteThreadSchema = z.object({
  id: z.string().cuid(),
});

export const createAnswerSchema = z.object({
  threadId: z.string().cuid(),
  content: z.string().min(10).max(50000),
});

export const updateAnswerSchema = z.object({
  id: z.string().cuid(),
  content: z.string().min(10).max(50000),
});

export const deleteAnswerSchema = z.object({
  id: z.string().cuid(),
});

export const acceptAnswerSchema = z.object({
  answerId: z.string().cuid(),
});

export const voteForumItemSchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(['thread', 'answer']),
  value: z.literal(1).or(z.literal(-1)),
});

export const forumByTagSchema = z.object({
  tag: z.string().min(1),
  page: z.number().min(1).default(1),
});

export const forumTitleLookupSchema = z.object({
  title: z.string().min(3).max(300),
});
