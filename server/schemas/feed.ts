import { z } from 'zod';

export const followingFeedSchema = z.object({
  filter: z.enum(['all', 'devlogs', 'articles', 'questions', 'milestones']).default('all'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(20).default(20),
});
