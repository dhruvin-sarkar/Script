import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_TAGS = [
  'javascript', 'typescript', 'react', 'nextjs', 'node', 'python', 'rust', 'go',
  'java', 'csharp', 'cpp', 'ruby', 'swift', 'php', 'kotlin', 'dart', 'html', 'css',
  'tailwind', 'sass', 'vue', 'angular', 'svelte', 'solid', 'express', 'nestjs',
  'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails', 'postgresql', 'mysql',
  'mongodb', 'sqlite', 'redis', 'elasticsearch', 'docker', 'kubernetes', 'aws',
  'gcp', 'azure', 'cloudflare', 'vercel', 'graphql', 'rest', 'linux', 'git', 'vim'
];

const BADGES = [
  {
    id: 'first-devlog',
    name: 'First Devlog',
    description: 'Wrote your first development log.',
    iconUrl: '/badges/first-devlog.svg',
    points: 10,
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    description: 'Coded for 7 consecutive days.',
    iconUrl: '/badges/streak-7.svg',
    points: 20,
  },
  {
    id: 'streak-30',
    name: '30-Day Streak',
    description: 'Coded for 30 consecutive days.',
    iconUrl: '/badges/streak-30.svg',
    points: 100,
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Logged over 100 hours of coding.',
    iconUrl: '/badges/century-club.svg',
    points: 50,
  },
  {
    id: 'first-answer',
    name: 'First Answer',
    description: 'Answered a question in the forum.',
    iconUrl: '/badges/first-answer.svg',
    points: 10,
  },
  {
    id: 'top-contributor',
    name: 'Top Contributor',
    description: 'Had 10 answers accepted in the forum.',
    iconUrl: '/badges/top-contributor.svg',
    points: 100,
  },
];

async function main() {
  console.log('Seeding database...');

  // Seed Tags
  console.log('Seeding tags...');
  for (const tagName of COMMON_TAGS) {
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
  }

  // Seed Badges
  console.log('Seeding badges...');
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { id: badge.id },
      update: badge,
      create: badge,
    });
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
