import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db";
import { encrypt } from "@/server/services/encryption";

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

  const storedClerkId = await redis.get<string>(`wakatime:state:${state}`);
  if (!storedClerkId || storedClerkId !== clerkId) {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  await redis.del(`wakatime:state:${state}`);

  const clientId = process.env.WAKATIME_CLIENT_ID!;
  const clientSecret = process.env.WAKATIME_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/wakatime/callback`;

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code,
  });

  const tokenRes = await fetch("https://wakatime.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    console.error("WakaTime token exchange failed", await tokenRes.text());
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?error=wakatime_token_exchange`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return new NextResponse("User not found in DB", { status: 404 });
  }

  const encryptedAccessToken = encrypt(access_token);
  const encryptedRefreshToken = encrypt(refresh_token);

  await prisma.wakatimeConnection.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/profile?success=wakatime_connected`);
}
