import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  website: z.string().url().max(100).nullable().optional().or(z.literal('')),
  twitterUrl: z.string().url().max(100).nullable().optional().or(z.literal('')),
  githubUrl: z.string().url().max(100).nullable().optional().or(z.literal('')),
  headline: z.string().max(100).nullable().optional(),
});

export const updateCustomCSSSchema = z.object({
  customCSS: z.string().max(5000).nullable().optional(),
});

export const addExperienceSchema = z.object({
  company: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const addEducationSchema = z.object({
  school: z.string().min(1).max(100),
  degree: z.string().min(1).max(100),
  field: z.string().max(100).nullable().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
});
