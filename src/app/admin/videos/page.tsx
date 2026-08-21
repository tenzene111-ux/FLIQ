"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, RotateCcw, Flag } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast";
import { cn, formatCount, formatTimeAgo } from "@/lib/utils";

interface AdminVideo {
  id: string;
  caption: string;
  thumbnailUrl: string;
  status: string;
  createdAt: string;
  user: { username: string; displayName: string };
  views: number;
  likes: number;
  comments: number;
  reportCount: number;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<AdminVideo[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  function load() {
    setError(false);
    fetch(`/api/admin/videos?q=${encodeURIComponent(query)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setVideos(d.videos))
      .catch(() => setError(true));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function act(v: AdminVideo, action: "remove" | "restore") {
    const res = await fetch(`/api/admin/videos/${v.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setVideos((prev) => prev?.map((x) => (x.id === v.id ? { ...x, status: action === "remove" ? "removed" : "published" } : x)) ?? null);
      toast("success", action === "remove" ? "Video removed" : "Video restored");
    } else {
      toast("error", "Action failed");
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-1">Videos</h1>
      <p className="text-muted text-sm mb-4">Review and moderate published content.</p>

      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 mb-4 max-w-sm">
        <Search size={16} className="text-muted-2" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search caption or creator" className="border-none bg-transparent px-1" />
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : videos === null ? (
        Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-3.5 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnailUrl} alt="" className="w-10 h-12 rounded-md object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate max-w-[220px]">{v.caption || "Untitled"}</p>
                <p className="text-muted-2 text-[11px] mt-0.5">
                  @{v.user.username} · {formatCount(v.views)} views · {formatTimeAgo(v.createdAt)}
                </p>
              </div>
              {v.reportCount > 0 && (
                <span className="flex items-center gap-1 text-warning text-[11px] font-semibold shrink-0">
                  <Flag size={11} /> {v.reportCount}
                </span>
              )}
              <span className={cn("text-[11px] font-semibold capitalize shrink-0", v.status === "removed" ? "text-danger" : "text-success")}>{v.status}</span>
              {v.status === "removed" ? (
                <button onClick={() => act(v, "restore")} className="text-fliq-cyan text-xs font-semibold flex items-center gap-1 shrink-0">
                  <RotateCcw size={13} /> Restore
                </button>
              ) : (
                <button onClick={() => act(v, "remove")} className="text-danger text-xs font-semibold flex items-center gap-1 shrink-0">
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          ))}
          {videos.length === 0 && <p className="text-center text-muted text-sm py-8">No videos found.</p>}
        </div>
      )}
    </div>
  );
}
