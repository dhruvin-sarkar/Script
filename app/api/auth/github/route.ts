import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getGithubAuthUrl } from '@/server/services/github';
import { prisma } from '@/server/db';

export async function GET() {
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

  try {
    const url = await getGithubAuthUrl(user.id);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('GitHub Auth Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
