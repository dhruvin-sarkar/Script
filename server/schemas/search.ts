import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  types: z.array(z.enum(['posts', 'devlogs', 'users'])).default(['posts', 'devlogs', 'users']),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(20).default(5),
});
