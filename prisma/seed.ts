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
    slug: 'first-devlog',
    name: 'First Devlog',
    description: 'Wrote your first development log.',
    icon: 'PenTool',
  },
  {
    slug: 'streak-7',
    name: '7-Day Streak',
    description: 'Coded for 7 consecutive days.',
    icon: 'Zap',
  },
  {
    slug: 'streak-30',
    name: '30-Day Streak',
    description: 'Coded for 30 consecutive days.',
    icon: 'Flame',
  },
  {
    slug: 'century-club',
    name: 'Century Club',
    description: 'Logged over 100 hours of coding.',
    icon: 'Trophy',
  },
  {
    slug: 'first-answer',
    name: 'First Answer',
    description: 'Answered a question in the forum.',
    icon: 'MessageSquareReply',
  },
  {
    slug: 'top-contributor',
    name: 'Top Contributor',
    description: 'Had 10 answers accepted in the forum.',
    icon: 'Award',
  },
];

async function main() {
  console.log('Seeding database...');

  // Seed Tags
  console.log('Seeding tags...');
  for (const tagName of COMMON_TAGS) {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName, slug },
    });
  }

  // Seed Badges
  console.log('Seeding badges...');
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
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
