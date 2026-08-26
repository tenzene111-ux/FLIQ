"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { CATEGORIES, type CategorySlug } from "@/lib/constants";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

export default function StartLivePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategorySlug>(CATEGORIES[0].slug);
  const [commentsOn, setCommentsOn] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!title.trim()) {
      toast("error", "Give your live a title");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, commentsOn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/live/${data.stream.id}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't start live");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="max-w-lg mx-auto w-full safe-top">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => router.back()} className="text-white" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">Go Live</h1>
      </div>

      <div className="px-4 flex flex-col gap-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your live about?" maxLength={100} />
        </div>

        <div>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1",
                  category === c.slug ? "bg-white text-black border-white" : "border-border text-white"
                )}
              >
                <c.icon size={13} /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white text-sm">Enable comments</span>
          <Switch checked={commentsOn} onChange={setCommentsOn} label="Enable comments" />
        </div>

        <div className="flex items-center justify-between opacity-60">
          <span className="flex items-center gap-2 text-white text-sm">
            <Users size={16} /> Invite guests
          </span>
          <span className="text-xs text-muted-2">Coming soon</span>
        </div>

        <Button size="lg" fullWidth onClick={handleStart} loading={loading} className="mt-2">
          Start Live
        </Button>
      </div>
    </PageContainer>
  );
}
