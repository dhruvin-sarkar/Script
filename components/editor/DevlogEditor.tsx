"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api as trpc } from "@/app/providers";
import { Button } from "@/components/ui/button";

export function DevlogEditor() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<"PRODUCTIVE" | "STRUGGLING" | "LEARNING" | "EXPERIMENTING" | "FLOW" | undefined>();
  const [tags, setTags] = useState("");

  const utils = trpc.useUtils();
  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      utils.post.getFeed.invalidate();
      utils.post.getByUser.invalidate();
      router.push("/feed");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate({
      type: "DEVLOG",
      content,
      mood,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      privacy: "PUBLIC",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">What did you build today?</label>
        <textarea 
          className="w-full min-h-[200px] p-3 rounded-md bg-transparent border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="I finally got the authentication working using..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">Mood (Optional)</label>
          <select 
            className="w-full p-2.5 rounded-md bg-transparent border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={mood || ""}
            onChange={(e) => setMood(e.target.value as any || undefined)}
          >
            <option value="" className="bg-background">None</option>
            <option value="PRODUCTIVE" className="bg-background">Productive 🚀</option>
            <option value="STRUGGLING" className="bg-background">Struggling 😅</option>
            <option value="LEARNING" className="bg-background">Learning 🧠</option>
            <option value="EXPERIMENTING" className="bg-background">Experimenting 🧪</option>
            <option value="FLOW" className="bg-background">In Flow 🌊</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">Tags (comma separated)</label>
          <input 
            type="text"
            className="w-full p-2.5 rounded-md bg-transparent border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="react, typescript, learning"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={createPost.isPending || !content.trim()}>
          {createPost.isPending ? "Posting..." : "Post Devlog"}
        </Button>
      </div>
    </form>
  );
}
