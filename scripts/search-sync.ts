import { processSyncQueue } from '../server/services/search-sync';

async function main(): Promise<void> {
  await processSyncQueue(100);
}

main().catch((error) => {
  console.error('[search-sync] failed', error);
  process.exit(1);
});
