import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

interface ClerkUserData {
  id: string;
  username: string | null;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'CLERK_WEBHOOK_SECRET is not set' },
      { status: 500 },
    );
  }

  // Get Svix headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 },
    );
  }

  // Verify the webhook signature
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 },
    );
  }

  const eventType = event.type;
  const data = event.data as unknown as ClerkUserData;

  try {
    switch (eventType) {
      case 'user.created': {
        const email = data.email_addresses[0]?.email_address ?? '';
        const displayName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(' ') || null;

        // Generate username from Clerk username or email prefix
        const username =
          data.username ?? email.split('@')[0] ?? `user-${data.id.slice(-8)}`;

        const user = await prisma.user.create({
          data: {
            clerkId: data.id,
            username,
            email,
            displayName,
            avatar: data.image_url,
          },
        });

        // Create an empty Profile record alongside the user
        await prisma.profile.create({
          data: {
            userId: user.id,
          },
        });

        break;
      }

      case 'user.updated': {
        const email = data.email_addresses[0]?.email_address;
        const displayName = [data.first_name, data.last_name]
          .filter(Boolean)
          .join(' ') || null;

        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: {
            ...(email ? { email } : {}),
            displayName,
            avatar: data.image_url,
            ...(data.username ? { username: data.username } : {}),
          },
        });

        break;
      }

      case 'user.deleted': {
        // Soft-delete — set deletedAt, never hard-delete
        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: {
            deletedAt: new Date(),
          },
        });

        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Clerk webhook error (${eventType}):`, message);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    );
  }
}
