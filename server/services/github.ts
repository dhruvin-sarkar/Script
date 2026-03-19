import { redis } from '@/lib/redis';
import { prisma } from '@/server/db';
import { decrypt, encrypt } from '@/server/services/encryption';
import { TRPCError } from '@trpc/server';

const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

export async function getGithubAuthUrl(userId: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error('GITHUB_CLIENT_ID not set');

  const state = crypto.randomUUID();
  await redis.setex(`github:oauth:state:${state}`, 600, userId);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user,repo');
  url.searchParams.set('state', state);

  return url.toString();
}

export async function exchangeGithubCode(
  code: string,
  state: string,
  userId: string,
): Promise<void> {
  const storedUserId = await redis.get<string>(`github:oauth:state:${state}`);
  if (!storedUserId || storedUserId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid state' });
  }

  await redis.del(`github:oauth:state:${state}`);

  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'GitHub token exchange failed' });
  }

  const tokenData = await res.json();
  const { access_token } = tokenData;

  if (!access_token) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'No access token received from GitHub',
    });
  }

  // Get user info to get the githubLogin
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch GitHub user info',
    });
  }

  const userData = await userRes.json();
  const githubLogin = userData.login;
  const githubId = userData.id.toString();

  const encryptedAccess = encrypt(access_token);

  await prisma.githubConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encryptedAccess,
      githubLogin,
      githubId,
    },
    update: {
      accessToken: encryptedAccess,
      githubLogin,
      githubId,
    },
  });
}

export interface GithubRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: { name: string; color: string } | null;
}

export interface GithubContributions {
  total: number;
  calendar: Array<{
    date: string;
    count: number;
    color: string;
  }>;
}

export interface GithubLanguageStat {
  name: string;
  color: string;
  count: number;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.githubConnection.findUnique({
    where: { userId },
  });
  if (!connection) return null;
  return decrypt(connection.accessToken);
}

async function getGithubLogin(userId: string): Promise<string | null> {
  const connection = await prisma.githubConnection.findUnique({
    where: { userId },
  });
  return connection?.githubLogin || null;
}

export async function getGithubRepos(userId: string): Promise<GithubRepo[] | null> {
  const cacheKey = `github:repos:${userId}`;
  const cached = await redis.get<GithubRepo[]>(cacheKey);
  if (cached) return cached;

  const accessToken = await getAccessToken(userId);
  const login = await getGithubLogin(userId);
  if (!accessToken || !login) return null;

  const query = `
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              stargazerCount
              forkCount
              primaryLanguage {
                name
                color
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Script-Platform',
    },
    body: JSON.stringify({ query, variables: { login } }),
  });

  if (!response.ok) return null;
  const result = (await response.json()) as {
    data?: { user?: { pinnedItems?: { nodes?: unknown[] } } };
  };
  const repos =
    result.data?.user?.pinnedItems?.nodes?.map(
      (repo: {
        name: string;
        description: string | null;
        url: string;
        stargazerCount: number;
        forkCount: number;
        primaryLanguage: { name: string; color: string } | null;
      }) => ({
        name: repo.name,
        description: repo.description,
        url: repo.url,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        language: repo.primaryLanguage,
      }),
    ) || [];

  await redis.set(cacheKey, repos, { ex: 3600 });
  return repos;
}

export async function getGithubContributions(userId: string): Promise<GithubContributions | null> {
  const cacheKey = `github:contributions:${userId}`;
  const cached = await redis.get<GithubContributions>(cacheKey);
  if (cached) return cached;

  const accessToken = await getAccessToken(userId);
  const login = await getGithubLogin(userId);
  if (!accessToken || !login) return null;

  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                color
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Script-Platform',
    },
    body: JSON.stringify({ query, variables: { login } }),
  });

  if (!response.ok) return null;
  const result = (await response.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions: number;
            weeks: Array<{
              contributionDays: Array<{
                date: string;
                contributionCount: number;
                color: string;
              }>;
            }>;
          };
        };
      };
    };
  };
  const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;

  if (!calendar) return null;

  const data: GithubContributions = {
    total: calendar.totalContributions,
    calendar: calendar.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
        color: d.color,
      })),
    ),
  };

  await redis.set(cacheKey, data, { ex: 3600 });
  return data;
}

export async function getGithubLanguageStats(userId: string): Promise<GithubLanguageStat[] | null> {
  const cacheKey = `github:languages:${userId}`;
  const cached = await redis.get<GithubLanguageStat[]>(cacheKey);
  if (cached) return cached;

  // We can derive top languages from recent repos or pins
  // For now, let's use up to 20 recent repos to get a better distribution than just 6 pins
  const accessToken = await getAccessToken(userId);
  const login = await getGithubLogin(userId);
  if (!accessToken || !login) return null;

  const query = `
    query($login: String!) {
      user(login: $login) {
        repositories(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}, isFork: false) {
          nodes {
            primaryLanguage {
              name
              color
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Script-Platform',
    },
    body: JSON.stringify({ query, variables: { login } }),
  });

  if (!response.ok) return null;
  const result = (await response.json()) as {
    data?: {
      user?: {
        repositories?: {
          nodes: Array<{
            primaryLanguage: { name: string; color: string } | null;
          }>;
        };
      };
    };
  };
  const repos = result.data?.user?.repositories?.nodes || [];

  const langMap: Record<string, { color: string; count: number }> = {};
  repos.forEach((r) => {
    if (r.primaryLanguage) {
      if (!langMap[r.primaryLanguage.name]) {
        langMap[r.primaryLanguage.name] = { color: r.primaryLanguage.color, count: 0 };
      }
      langMap[r.primaryLanguage.name].count++;
    }
  });

  const stats = Object.entries(langMap)
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.count - a.count);

  await redis.set(cacheKey, stats, { ex: 3600 });
  return stats;
}
