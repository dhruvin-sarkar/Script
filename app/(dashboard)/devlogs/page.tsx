"use client";

import { api } from "@/app/providers";
import { DevlogCard } from "@/components/post/DevlogCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";

export default function DevlogsPage() {
  const { user } = useUser();
  const { data, isLoading } = api.devlog.getByUser.useQuery({
    authorId: user?.id ?? "",
    limit: 20
  }, {
    enabled: !!user?.id
  });

  return (
    <div className="container max-w-4xl py-10 mx-auto px-4 md:px-0">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Devlogs</h1>
        <Link href="/devlog/new">
          <Button variant="default" className="shadow-sm">New Devlog</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
             <div key={i} className="h-40 w-full animate-pulse bg-muted rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {data?.items.map((post: any) => (
            <DevlogCard key={post.id} post={post} />
          ))}
          {(!data?.items || data.items.length === 0) && (
             <div className="text-center py-20 border border-dashed rounded-xl">
               <p className="text-muted-foreground text-lg">No devlogs yet.</p>
               <Link href="/devlog/new">
                 <Button variant="link" className="mt-2 text-primary">Write your first entry</Button>
               </Link>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
