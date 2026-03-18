import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = process.env.WAKATIME_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("WakaTime not configured", { status: 500 });
  }

  const state = crypto.randomUUID();
  
  await redis.setex(`wakatime:state:${state}`, 600, userId);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/wakatime/callback`;

  const wakatimeAuthUrl = new URL("https://wakatime.com/oauth/authorize");
  wakatimeAuthUrl.searchParams.set("client_id", clientId);
  wakatimeAuthUrl.searchParams.set("response_type", "code");
  wakatimeAuthUrl.searchParams.set("redirect_uri", redirectUri);
  wakatimeAuthUrl.searchParams.set("scope", "email,read_stats,read_logged_time");
  wakatimeAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(wakatimeAuthUrl.toString());
}
