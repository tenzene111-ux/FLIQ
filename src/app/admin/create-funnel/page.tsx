"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

interface FunnelData {
  days: number;
  funnel: { type: string; count: number }[];
  opened: number;
  published: number;
  conversionRate: number;
}

const LABELS: Record<string, string> = {
  CREATE_OPENED: "Opened Create",
  CREATE_VIDEO_SELECTED: "Chose Video",
  CREATE_PHOTO_SELECTED: "Chose Photo",
  CREATE_LIVE_SELECTED: "Chose LIVE",
  CAMERA_OPENED: "Camera opened",
  RECORD_STARTED: "Started recording",
  RECORD_COMPLETED: "Finished a clip",
  VIDEO_UPLOADED: "Uploaded existing video",
  EDITOR_OPENED: "Opened editor",
  VIDEO_TRIMMED: "Trimmed video",
  FILTER_USED: "Used a filter",
  SOUND_SELECTED: "Picked a sound",
  TEXT_ADDED: "Added text",
  STICKER_ADDED: "Added a sticker",
  DRAFT_SAVED: "Saved a draft",
  POST_STARTED: "Tapped Post",
  POST_PUBLISHED: "Published",
  POST_FAILED: "Post failed",
  POST_CANCELLED: "Cancelled / discarded",
};

export default function CreateFunnelPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<FunnelData | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    setData(null);
    fetch(`/api/admin/create-funnel?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }

  useEffect(load, [days]);

  const max = data ? Math.max(1, ...data.funnel.map((f) => f.count)) : 1;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-white text-2xl font-bold">Create Funnel</h1>
        <div className="flex gap-1">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", days === d ? "bg-white text-black" : "bg-surface-2 text-muted")}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <p className="text-muted text-sm mb-6">Where people drop off between opening Create and publishing.</p>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3 mb-5 flex items-center justify-between">
            <div>
              <p className="text-muted-2 text-xs">Opened → Published</p>
              <p className="text-white font-bold text-lg">
                {data.opened} → {data.published}
              </p>
            </div>
            <p className="text-fliq-cyan font-bold text-2xl">{Math.round(data.conversionRate * 100)}%</p>
          </div>

          <div className="flex flex-col gap-2">
            {data.funnel.map((f) => (
              <div key={f.type} className="flex items-center gap-3">
                <span className="text-xs text-muted w-36 shrink-0 truncate">{LABELS[f.type] ?? f.type}</span>
                <div className="flex-1 h-6 bg-surface-2 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-gradient-brand-horizontal rounded-md transition-[width]"
                    style={{ width: `${Math.max(2, (f.count / max) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-white font-semibold w-10 text-right shrink-0">{f.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
