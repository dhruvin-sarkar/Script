"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/app/providers";
import { DevlogCard } from "@/components/post/DevlogCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

function PostFeed({ type }: { type: "feed" | "discover" }) {
  const { ref, inView } = useInView();
  
  const query = type === "feed" 
    ? api.post.getFeed.useInfiniteQuery(
        { limit: 10 },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
      )
    : api.post.getDiscover.useInfiniteQuery(
        { limit: 10 },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
      );

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  const posts = query.data?.pages.flatMap((page) => page.items) || [];

  if (posts.length === 0) {
    return (
      <div className="p-12 border border-dashed rounded-2xl text-center opacity-60">
        <p className="italic mb-2">No posts found.</p>
        <p className="text-sm">
          {type === "feed" 
            ? "Follow some developers to see their activity here!" 
            : "Check back later for new updates."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <DevlogCard key={post.id} post={post as any} /> 
      ))}
      
      <div ref={ref} className="h-10 flex items-center justify-center">
        {query.isFetchingNextPage && <Skeleton className="h-8 w-8 rounded-full" />}
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="container max-w-4xl py-10 mx-auto px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2">Community</h1>
        <p className="text-muted-foreground text-lg italic">
          What&apos;s happening in the Script ecosystem.
        </p>
      </div>

      <Tabs defaultValue="discover" className="space-y-8">
        <TabsList className="bg-background border-b rounded-none h-12 p-0 w-full justify-start gap-8 px-2 border-none">
          <TabsTrigger 
            value="discover" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent hover:text-accent font-semibold px-0 h-11 transition-all"
          >
            Discover
          </TabsTrigger>
          <TabsTrigger 
            value="following" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none bg-transparent hover:text-accent font-semibold px-0 h-11 transition-all"
          >
            Following
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="pt-4">
          <PostFeed type="discover" />
        </TabsContent>
        
        <TabsContent value="following" className="pt-4">
          <PostFeed type="feed" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
