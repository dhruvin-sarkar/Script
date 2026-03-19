import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db";
import { encrypt } from "@/server/services/encryption";

import { exchangeWakatimeCode } from "@/server/services/wakatime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (error || !code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?error=wakatime_auth_failed`);
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return new NextResponse("User not found in DB", { status: 404 });
  }

  try {
    await exchangeWakatimeCode(code, state, user.id);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?success=wakatime_connected`);
  } catch (err) {
    console.error("WakaTime token exchange failed", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?error=wakatime_token_exchange`);
  }
}
