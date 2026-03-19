import { redis } from "@/lib/redis";
import { prisma } from "@/server/db";
import { encrypt, decrypt } from "./encryption";
import { TRPCError } from "@trpc/server";

export async function getWakatimeAuthUrl(userId: string): Promise<string> {
  const clientId = process.env.WAKATIME_CLIENT_ID;
  if (!clientId) throw new Error("WAKATIME_CLIENT_ID not set");

  const state = crypto.randomUUID();
  await redis.setex(`wakatime:oauth:state:${state}`, 600, userId);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/wakatime/callback`;
  const url = new URL("https://wakatime.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "email,read_stats,read_logged_time");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeWakatimeCode(code: string, state: string, userId: string): Promise<void> {
  const storedUserId = await redis.get<string>(`wakatime:oauth:state:${state}`);
  if (!storedUserId || storedUserId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid state" });
  }

  await redis.del(`wakatime:oauth:state:${state}`);

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

  const res = await fetch("https://wakatime.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!res.ok) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "WakaTime token exchange failed" });
  }

  const tokenData = await res.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  const encryptedAccess = encrypt(access_token);
  const encryptedRefresh = encrypt(refresh_token);

  await prisma.wakatimeConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
}

export type WakatimeStats = {
  totalSeconds: number;
  languages: Record<string, number>;
  projects: Record<string, number>;
};

export async function getWakatimeStats(userId: string): Promise<WakatimeStats | null> {
  const cacheKey = `wakatime:${userId}:stats`;
  const cached = await redis.get<WakatimeStats>(cacheKey);
  if (cached) return cached;

  const connection = await prisma.wakatimeConnection.findUnique({
    where: { userId }
  });
  if (!connection) return null;

  const accessToken = decrypt(connection.accessToken);

  const res = await fetch("https://wakatime.com/api/v1/users/current/stats/last_7_days", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
       // Ideally refresh token here. For strict phase constraints, just returning null works for now.
    }
    return null;
  }

  const data = (await res.json())?.data;
  if (!data) return null;
  
  const stats: WakatimeStats = {
    totalSeconds: data.total_seconds || 0,
    languages: {},
    projects: {},
  };

  if (Array.isArray(data.languages)) {
    data.languages.forEach((l: { name: string; total_seconds: number }) => {
      stats.languages[l.name] = l.total_seconds;
    });
  }
  if (Array.isArray(data.projects)) {
    data.projects.forEach((p: { name: string; total_seconds: number }) => {
      stats.projects[p.name] = p.total_seconds;
    });
  }

  await redis.setex(cacheKey, 900, stats);
  return stats;
}

export async function getWakatimeSnapshotForDate(userId: string, dateStr: string) {
  const cacheKey = `wakatime:${userId}:date:${dateStr}`;
  const cached = await redis.get<any>(cacheKey);
  if (cached) return cached;

  const connection = await prisma.wakatimeConnection.findUnique({
    where: { userId }
  });
  if (!connection) return null;

  const accessToken = decrypt(connection.accessToken);

  const res = await fetch(`https://wakatime.com/api/v1/users/current/summaries?start=${dateStr}&end=${dateStr}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) return null;

  const summary = await res.json();
  const summaryData = summary.data?.[0];
  if (!summaryData) return null;

  const totalSeconds = summaryData.total_seconds || 0;
  
  const parsedData = {
    languages: summaryData.languages?.reduce((acc: Record<string, number>, curr: { name: string; total_seconds: number }) => ({ ...acc, [curr.name]: curr.total_seconds }), {}),
    projects: summaryData.projects?.reduce((acc: Record<string, number>, curr: { name: string; total_seconds: number }) => ({ ...acc, [curr.name]: curr.total_seconds }), {}),
  };

  const stat = await prisma.dailyStat.upsert({
    where: {
      userId_date: {
        userId,
        date: new Date(dateStr)
      }
    },
    create: {
      userId,
      date: new Date(dateStr),
      totalSec: totalSeconds,
      languages: parsedData.languages,
      projects: parsedData.projects,
    },
    update: {
      totalSec: totalSeconds,
      languages: parsedData.languages,
      projects: parsedData.projects,
    }
  });

  await redis.setex(cacheKey, 86400, stat);
  return stat;
}

export async function setLiveStatus(userId: string): Promise<void> {
  await redis.setex(`${userId}_live`, 300, "true");
}
