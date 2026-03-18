import { z } from "zod";
import { PostType, Mood, Privacy, ReactionType } from "@prisma/client";

export const createPostSchema = z.object({
  type: z.nativeEnum(PostType),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long").optional(),
  content: z.string().min(1, "Content cannot be empty"),
  slug: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
  coverImage: z.string().url("Must be a valid URL").optional(),
  mood: z.nativeEnum(Mood).optional(),
  privacy: z.nativeEnum(Privacy).default("PUBLIC"),
  tags: z.array(z.string()).max(5, "Maximum 5 tags allowed").optional(),
  
  // Specific to PostType.ANSWER
  parentId: z.string().optional(),
  
  // Specific to Series
  seriesId: z.string().optional(),
});

export const editPostSchema = createPostSchema.extend({
  id: z.string(),
});

export const getPostsFilterSchema = z.object({
  type: z.nativeEnum(PostType).optional(),
  privacy: z.nativeEnum(Privacy).optional(),
  authorId: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const votePostSchema = z.object({
  postId: z.string(),
  value: z.number().int().min(-1).max(1), // 1 for upvote, -1 for downvote, 0 to remove
});

export const reactPostSchema = z.object({
  postId: z.string(),
  reaction: z.nativeEnum(ReactionType),
});
