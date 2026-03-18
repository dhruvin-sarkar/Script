import { Metadata } from "next";
import { DevlogEditor } from "@/components/editor/DevlogEditor";

export const metadata: Metadata = {
  title: "New Devlog - Script",
  description: "Create a new development log entry based on today's WakaTime stats.",
};

export default function NewDevlogPage() {
  return (
    <div className="container max-w-4xl py-10 mx-auto">
      <h1 className="text-3xl font-bold mb-8 tracking-tight">New Devlog</h1>
      <div className="border border-border/50 rounded-xl p-6 md:p-8 bg-card text-card-foreground shadow-sm">
        <DevlogEditor />
      </div>
    </div>
  );
}
