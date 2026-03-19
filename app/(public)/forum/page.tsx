"use client";

import { api } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shared/Avatar";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, CheckCircle2, TrendingUp, Filter } from "lucide-react";
import { PostType } from "@prisma/client";

function QuestionRow({ question }: { question: any }) {
  const totalVotes = question.votes.reduce((acc: number, v: any) => acc + v.value, 0);

  return (
    <Link 
      href={`/forum/${question.id}`}
      className="flex gap-6 p-6 bg-card border border-border rounded-2xl hover:border-accent/40 hover:shadow-md transition-all group"
    >
      <div className="flex flex-col items-center justify-center gap-1 min-w-[60px] h-fit py-2 px-1 rounded-xl bg-accent/5">
        <span className="text-xl font-black text-accent">{totalVotes}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">votes</span>
      </div>

      <div className="flex-1 space-y-3">
        <h3 className="text-xl font-bold group-hover:text-accent transition-colors leading-tight">
          {question.title}
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {question.tags.map((t: any) => (
            <span key={t.tag.slug} className="text-xs font-medium text-muted-foreground opacity-70">
              #{t.tag.name}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-6 h-6">
              <AvatarImage src={question.author.avatar || undefined} />
              <AvatarFallback>{question.author.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-primary">@{question.author.username}</span>
              {" • "}
              {formatDistanceToNow(new Date(question.createdAt))} ago
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5 opacity-60">
              <MessageSquare className="w-4 h-4" />
              {question._count.replies}
            </div>
            {question.solved && (
              <div className="flex items-center gap-1.5 text-accent animate-pulse">
                <CheckCircle2 className="w-4 h-4 fill-accent/10" />
                Solved
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ForumPage() {
  const { ref, inView } = useInView();
  const [filter, setFilter] = useState<"all" | "solved" | "unsolved">("all");

  const query = api.post.getDiscover.useInfiniteQuery(
    { 
      limit: 15,
      type: PostType.QUESTION,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  const questions = query.data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="container max-w-5xl py-12 mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded-xl">
              <TrendingUp className="w-6 h-6 text-background" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Forum</h1>
          </div>
          <p className="text-muted-foreground text-lg italic pl-1">
            Solve problems, share knowledge, and level up together.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button className="rounded-full font-bold shadow-lg shadow-accent/20">
            Ask a Question
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {query.isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : questions.length === 0 ? (
            <div className="p-20 border-2 border-dashed rounded-3xl text-center opacity-40 italic">
              No questions found yet. Be the first to ask!
            </div>
          ) : (
            <>
              {questions.map((q) => (
                <QuestionRow key={q.id} question={q} />
              ))}
              <div ref={ref} className="h-20 flex items-center justify-center">
                {query.isFetchingNextPage && <Skeleton className="h-10 w-10 rounded-full animate-spin" />}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-8">
          <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-accent">Trending Tags</h3>
            <div className="flex flex-wrap gap-2">
              {['react', 'typescript', 'nextjs', 'prisma', 'trpc', 'tailwind'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-background border border-accent/20 rounded-full text-xs font-bold text-accent/80 cursor-pointer hover:bg-accent hover:text-background transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest opacity-60">Guidelines</h3>
            <ul className="text-xs space-y-3 text-muted-foreground list-disc pl-4 italic">
              <li>Be kind and respectful.</li>
              <li>Provide code snippets where possible.</li>
              <li>Mark the correct answer as accepted.</li>
              <li>Search before you ask.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
