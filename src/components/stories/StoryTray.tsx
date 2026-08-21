"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

export interface StoryGroup {
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
  viewed: boolean;
  stories: { id: string; mediaUrl: string; mediaType: string; text: string | null; createdAt: string }[];
}

export function StoryTray() {
  const currentUser = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    fetch("/api/stories/feed")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups))
      .catch(() => setGroups([]));
  }

  useEffect(load, []);

  const myGroup = groups?.find((g) => g.user.id === currentUser?.id);

  async function handleCreateStory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: data.url, mediaType: data.kind === "video" ? "video" : "image" }),
      });
      toast("success", "Story posted");
      load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't post story");
    } finally {
      setUploading(false);
    }
  }

  if (!currentUser) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar px-4 py-3">
      <button onClick={() => (myGroup ? setViewerIndex(groups!.indexOf(myGroup)) : fileInputRef.current?.click())} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
        <div className="relative">
          <Avatar src={currentUser.avatarUrl} alt={currentUser.displayName} size="lg" ring={!!myGroup && !myGroup.viewed} />
          <span
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-brand-horizontal flex items-center justify-center border-2 border-background"
          >
            {uploading ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> : <Plus size={11} className="text-white" />}
          </span>
        </div>
        <span className="text-[11px] text-muted truncate w-16 text-center">Your Story</span>
      </button>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleCreateStory} />

      {groups
        ?.filter((g) => g.user.id !== currentUser.id)
        .map((g) => (
          <button key={g.user.id} onClick={() => setViewerIndex(groups.indexOf(g))} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <Avatar src={g.user.avatarUrl} alt={g.user.displayName} size="lg" ring={!g.viewed} className={cn(g.viewed && "opacity-60")} />
            <span className="text-[11px] text-muted truncate w-16 text-center">{g.user.username}</span>
          </button>
        ))}

      {groups && groups.length > 0 && viewerIndex !== null && (
        <StoryViewer groups={groups} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} onViewed={load} />
      )}
    </div>
  );
}
