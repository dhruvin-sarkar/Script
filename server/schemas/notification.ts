import { z } from 'zod';

export const listNotificationsSchema = z.object({
  page: z.number().min(1).default(1),
  unreadOnly: z.boolean().default(false),
});

export const markNotificationsReadSchema = z.object({
  id: z.string().cuid().optional(),
});
