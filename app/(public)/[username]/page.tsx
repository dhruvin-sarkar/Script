import { prisma } from '@/server/db';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsStrip } from '@/components/profile/StatsStrip';
import { StackTimeline } from '@/components/stats/StackTimeline';
import { ContributionHeatmap } from '@/components/stats/ContributionHeatmap';
import { StreakWidget } from '@/components/stats/StreakWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DevlogCard } from '@/components/post/DevlogCard';

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const decodedUsername = decodeURIComponent(params.username).replace(/^@/, '');
  const user = await prisma.user.findUnique({ where: { username: decodedUsername } });
  if (!user) return { title: 'User Not Found' };
  return { title: `${user.displayName || user.username} (@${user.username}) - Script` };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const decodedUsername = decodeURIComponent(params.username).replace(/^@/, '');
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { username: decodedUsername, deletedAt: null },
    include: {
      profile: {
        include: {
          experiences: { orderBy: { startDate: 'desc' } },
          educations: { orderBy: { startDate: 'desc' } },
        },
      },
      badges: { include: { badge: true } },
      _count: {
        select: { followers: true, following: true, posts: true },
      },
      posts: {
        where: { privacy: 'PUBLIC', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      githubConn: true,
    },
  });

  if (!user) {
    notFound();
  }

  type UserWithRelations = Prisma.UserGetPayload<{
    include: {
      profile: {
        include: {
          experiences: true;
          educations: true;
        };
      };
      badges: { include: { badge: true } };
      _count: {
        select: { followers: true; following: true; posts: true };
      };
      posts: true;
      githubConn: true;
    };
  }>;

  const typedUser = user as unknown as UserWithRelations;
  const currentUser = clerkId
    ? await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    : null;
  const isOwner = currentUser?.id === typedUser.id;

  // Check if following
  const follow = currentUser
    ? await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: typedUser.id,
          },
        },
      })
    : null;

  // Mock data for demo purposes if real stats aren't available yet
  const stats = {
    posts: typedUser._count.posts,
    reputation: typedUser.reputation,
    followers: typedUser._count.followers,
    streak: 0, // Should be calculated from DailyStats
  };

  // Mock timeline data
  const timelineData = [
    { date: 'Mon', devlogs: 2, articles: 0, questions: 1 },
    { date: 'Tue', devlogs: 1, articles: 1, questions: 0 },
    { date: 'Wed', devlogs: 3, articles: 0, questions: 2 },
    { date: 'Thu', devlogs: 0, articles: 2, questions: 1 },
    { date: 'Fri', devlogs: 2, articles: 0, questions: 0 },
    { date: 'Sat', devlogs: 1, articles: 0, questions: 0 },
    { date: 'Sun', devlogs: 0, articles: 1, questions: 0 },
  ];

  return (
    <div className="profile-root container mx-auto max-w-5xl px-4 py-10">
      {typedUser.customCSS && <style dangerouslySetInnerHTML={{ __html: typedUser.customCSS }} />}

      <ProfileHeader user={typedUser} isFollowing={!!follow} isOwner={isOwner} />

      <StatsStrip stats={stats} />

      <Tabs defaultValue="activity" className="space-y-8">
        <TabsList className="bg-background h-12 w-full justify-start gap-8 rounded-none border-b border-none p-0 px-2">
          <TabsTrigger
            value="activity"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            About
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:border-accent hover:text-accent h-11 rounded-none bg-transparent px-0 font-semibold transition-all data-[state=active]:border-b-2"
          >
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-8 md:col-span-2">
              <section>
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                  <span className="bg-accent inline-block h-6 w-1.5 rounded-full" />
                  Recent Activity
                </h2>
                {typedUser.posts.length > 0 ? (
                  <div className="space-y-4">
                    {typedUser.posts.map((post) => (
                      <DevlogCard
                        key={post.id}
                        post={post as unknown as Prisma.PostGetPayload<Record<string, never>>}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center opacity-60">
                    <p className="mb-2 italic">No public activity yet.</p>
                    <p className="text-sm">
                      When @{typedUser.username} shares posts, they&apos;ll appear here.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-8">
              <StreakWidget streak={stats.streak} />

              <section className="bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
                  Badges
                </h3>
                {typedUser.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {typedUser.badges.map(({ badge }) => (
                      <div
                        key={badge.id}
                        className="bg-accent-dim text-accent border-accent/20 flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-bold"
                        title={badge.description}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs italic">No badges earned yet.</p>
                )}
              </section>

              <section className="bg-card rounded-xl border p-6 shadow-sm">
                <h3 className="text-muted-foreground mb-4 text-sm font-bold tracking-widest uppercase">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-secondary rounded px-2.5 py-1 font-mono text-xs">React</span>
                  <span className="bg-secondary rounded px-2.5 py-1 font-mono text-xs">
                    TypeScript
                  </span>
                  <span className="bg-secondary rounded px-2.5 py-1 font-mono text-xs">
                    Next.js
                  </span>
                  <span className="bg-secondary rounded px-2.5 py-1 font-mono text-xs">
                    Tailwind
                  </span>
                </div>
              </section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-12">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Experience */}
            <section>
              <h2 className="mb-8 flex items-center gap-2 text-xl font-bold">
                <span className="bg-accent inline-block h-6 w-1.5 rounded-full" />
                Experience
              </h2>
              {typedUser.profile?.experiences && typedUser.profile.experiences.length > 0 ? (
                <div className="before:bg-border relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-px">
                  {typedUser.profile.experiences.map((exp) => (
                    <div key={exp.id} className="relative pl-6">
                      <div className="bg-accent ring-background absolute top-2.5 left-[-4.5px] h-2 w-2 rounded-full ring-4" />
                      <h3 className="text-lg leading-tight font-bold">{exp.title}</h3>
                      <p className="text-accent mb-1 font-semibold">{exp.company}</p>
                      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                        {new Date(exp.startDate).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {exp.endDate
                          ? new Date(exp.endDate).toLocaleDateString(undefined, {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Present'}
                      </p>
                      {exp.description && (
                        <p className="text-secondary text-sm leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No experience listed.</p>
              )}
            </section>

            {/* Education */}
            <section>
              <h2 className="mb-8 flex items-center gap-2 text-xl font-bold">
                <span className="bg-accent inline-block h-6 w-1.5 rounded-full" />
                Education
              </h2>
              {typedUser.profile?.educations && typedUser.profile.educations.length > 0 ? (
                <div className="before:bg-border relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-px">
                  {typedUser.profile.educations.map((edu) => (
                    <div key={edu.id} className="relative pl-6">
                      <div className="bg-accent ring-background absolute top-2.5 left-[-4.5px] h-2 w-2 rounded-full ring-4" />
                      <h3 className="text-lg leading-tight font-bold">{edu.school}</h3>
                      <p className="text-secondary mb-1 font-medium">
                        {edu.degree} {edu.field && `in ${edu.field}`}
                      </p>
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        {edu.startDate && new Date(edu.startDate).getFullYear()} -{' '}
                        {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No education listed.</p>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="md:col-span-2">
              <section className="bg-card relative overflow-hidden rounded-2xl border p-6 shadow-sm">
                <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
                  <span className="bg-accent inline-block h-5 w-1 rounded-full" />
                  GitHub Contribution Graph
                </h2>
                <ContributionHeatmap />
              </section>
            </div>

            <div className="md:col-span-2">
              <StackTimeline data={timelineData} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
