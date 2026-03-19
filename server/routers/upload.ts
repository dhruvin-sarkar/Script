import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { getPresignedUploadUrl } from '../services/r2';
import { TRPCError } from '@trpc/server';
import { randomBytes } from 'crypto';

export const uploadRouter = router({
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        target: z.enum(['avatar', 'post-image']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      // Generate a unique key for the file
      const fileExtension = input.filename.split('.').pop() || '';
      const uniqueId = randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const folder = input.target === 'avatar' ? 'avatars' : 'posts';
      const key = `${folder}/${ctx.userId}/${timestamp}-${uniqueId}.${fileExtension}`;

      const presignedUrl = await getPresignedUploadUrl(
        key,
        input.fileType,
        input.fileSize,
        input.target === 'avatar' ? 'avatar' : 'post'
      );

      return {
        presignedUrl,
        key,
        // The public URL where the file will be accessible after upload
        publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
      };
    }),
});
