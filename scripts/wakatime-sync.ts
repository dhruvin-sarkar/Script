import { PrismaClient } from "@prisma/client";
import { decrypt } from "../server/services/encryption";

const prisma = new PrismaClient();

async function syncWakatime() {
  console.log("Starting WakaTime sync...");
  const connections = await prisma.wakatimeConnection.findMany({
    include: { user: true }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const conn of connections) {
    try {
      console.log(`Syncing user ${conn.userId}...`);
      const accessToken = decrypt(conn.accessToken);
      
      const res = await fetch("https://wakatime.com/api/v1/users/current/summaries?range=Today", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        console.error(`Failed to fetch WakaTime stats for user ${conn.userId}: ${res.statusText}`);
        continue;
      }
      
      const data = await res.json();
      if (!data.data || data.data.length === 0) continue;
      
      const summary = data.data[0];
      const totalSec = summary.grand_total.total_seconds;
      const languages = summary.languages.reduce((acc: any, l: any) => {
        acc[l.name] = l.total_seconds;
        return acc;
      }, {});
      const projects = summary.projects.reduce((acc: any, p: any) => {
        acc[p.name] = p.total_seconds;
        return acc;
      }, {});
      const editors = summary.machines ? summary.machines.reduce((acc: any, m: any) => {
        acc[m.name] = m.total_seconds;
        return acc;
      }, {}) : {};

      await prisma.dailyStat.upsert({
        where: { userId_date: { userId: conn.userId, date: today } },
        create: {
          userId: conn.userId,
          date: today,
          totalSec,
          languages,
          projects,
          editors,
        },
        update: {
          totalSec,
          languages,
          projects,
          editors,
        }
      });
      
      // Backfill DEVLOG posts
      const devlogs = await prisma.post.findMany({
        where: {
          authorId: conn.userId,
          type: "DEVLOG",
          logDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          },
          statId: null
        }
      });
      
      if (devlogs.length > 0) {
        const stat = await prisma.dailyStat.findUnique({
          where: { userId_date: { userId: conn.userId, date: today } }
        });
        if (stat) {
          await prisma.post.updateMany({
            where: { id: { in: devlogs.map(d => d.id) } },
            data: { statId: stat.id }
          });
        }
      }
      console.log(`Successfully synced user ${conn.userId}`);
    } catch (error) {
       console.error(`Error syncing user ${conn.userId}:`, error);
    }
  }
  console.log("WakaTime sync complete.");
}

syncWakatime()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
