import { prisma } from '../server/db';
import { fetchGithubStats } from '../server/services/github';
import { redis } from '../lib/redis';

async function main() {
  console.log('Starting GitHub stats sync...');
  const connections = await prisma.githubConnection.findMany();

  let success = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      await Promise.all([
        redis.del(`github:repos:${conn.userId}`),
        redis.del(`github:contributions:${conn.userId}`),
        redis.del(`github:languages:${conn.userId}`),
      ]);

      await fetchGithubStats(conn.userId);
      success++;
    } catch (error) {
      console.error(`Failed to sync GitHub stats for user ${conn.userId}:`, error);
      failed++;
    }

    // Slight delay to avoid hitting GitHub API rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`GitHub sync complete. Success: ${success}, Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
