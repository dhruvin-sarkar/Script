import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { exchangeGithubCode } from '@/server/services/github';
import { prisma } from '@/server/db';

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return new NextResponse('User not found', { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return new NextResponse('Missing code or state', { status: 400 });
  }

  try {
    await exchangeGithubCode(code, state, user.id);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?tab=integrations`,
    );
  } catch (error) {
    console.error('GitHub Callback Error:', error);
    return new NextResponse('Authentication Failed', { status: 500 });
  }
}
