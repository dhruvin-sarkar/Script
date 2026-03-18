import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TRPCError } from '@trpc/server';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const AVATAR_MIME_TYPES: AllowedMimeType[] = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_POST_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const PRESIGNED_URL_EXPIRES_IN = 60; // seconds

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Generate a presigned PUT URL for uploading to R2.
 * Validates MIME type and file size before generating the URL.
 */
export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  size: number,
  target: 'avatar' | 'post' = 'post',
): Promise<string> {
  // Validate MIME type
  if (!isAllowedMimeType(mimeType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    });
  }

  // Additional avatar MIME type check (no GIF for avatars)
  if (target === 'avatar' && !AVATAR_MIME_TYPES.includes(mimeType)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid avatar file type: ${mimeType}. Allowed: ${AVATAR_MIME_TYPES.join(', ')}`,
    });
  }

  // Validate size
  const maxSize = target === 'avatar' ? MAX_AVATAR_SIZE : MAX_POST_IMAGE_SIZE;
  if (size > maxSize) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `File too large: ${(size / 1024 / 1024).toFixed(1)}MB. Maximum: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    });
  }

  if (size <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'File size must be greater than 0',
    });
  }

  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME ?? '',
    Key: key,
    ContentType: mimeType,
    ContentLength: size,
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN,
  });

  return presignedUrl;
}
