"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Flag } from "lucide-react";
import { toast } from "@/store/toast";
import { cn, formatTimeAgo } from "@/lib/utils";

interface AdminReport {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string; displayName: string; avatarUrl: string | null };
  reportedUser: { username: string; displayName: string; avatarUrl: string | null } | null;
  video: { id: string; caption: string; thumbnailUrl: string } | null;
  comment: { id: string; text: string } | null;
}

const TABS = ["pending", "reviewing", "resolved"] as const;

export default function AdminReportsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch(`/api/admin/reports?status=${tab}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setReports(d.reports))
      .catch(() => setError(true));
  }

  useEffect(load, [tab]);

  async function updateStatus(report: AdminReport, status: string) {
    const res = await fetch(`/api/admin/reports/${report.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setReports((prev) => prev?.filter((r) => r.id !== report.id) ?? null);
      toast("success", `Report marked ${status}`);
    } else {
      toast("error", "Couldn't update report");
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-1">Reports</h1>
      <p className="text-muted text-sm mb-4">Review flagged content and take action.</p>

      <div className="flex items-center gap-5 border-b border-border mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("pb-2.5 text-sm font-semibold capitalize border-b-2 -mb-px", tab === t ? "text-white border-white" : "text-muted-2 border-transparent")}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : reports === null ? (
        Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title={`No ${tab} reports`} />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-warning uppercase">{r.reason}</span>
                <span className="text-[11px] text-muted-2">{formatTimeAgo(r.createdAt)}</span>
              </div>
              <p className="text-white text-sm mb-1">
                Reported by <span className="font-semibold">@{r.reporter.username}</span> · target: {r.targetType}
                {r.reportedUser && (
                  <>
                    {" "}
                    → <Link href={`/profile/${r.reportedUser.username}`} className="text-fliq-cyan">@{r.reportedUser.username}</Link>
                  </>
                )}
              </p>
              {r.video && (
                <Link href={`/video/${r.video.id}`} className="flex items-center gap-2 mt-2 bg-surface-2 rounded-lg p-2 w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.video.thumbnailUrl} alt="" className="w-8 h-10 rounded object-cover" />
                  <span className="text-xs text-white truncate max-w-[200px]">{r.video.caption || "View video"}</span>
                </Link>
              )}
              {r.comment && <p className="text-xs text-muted bg-surface-2 rounded-lg p-2 mt-2">&ldquo;{r.comment.text}&rdquo;</p>}
              {r.details && <p className="text-xs text-muted mt-2">{r.details}</p>}

              <div className="flex items-center gap-2 mt-3">
                {tab !== "reviewing" && (
                  <button onClick={() => updateStatus(r, "reviewing")} className="flex items-center gap-1 text-xs font-semibold text-fliq-cyan">
                    <Eye size={13} /> Mark reviewing
                  </button>
                )}
                {tab !== "resolved" && (
                  <button onClick={() => updateStatus(r, "resolved")} className="flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 size={13} /> Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
