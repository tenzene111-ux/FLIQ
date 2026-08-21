"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, Video, Eye, Flag, DollarSign } from "lucide-react";
import { StatTile } from "@/components/analytics/StatTile";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

interface Stats {
  users: number;
  activeUsers: number;
  videos: number;
  views: number;
  reports: number;
  pendingReports: number;
  revenue: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    fetch("/api/admin/overview")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setStats(d.stats))
      .catch(() => setError(true));
  }

  useEffect(load, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-white text-2xl font-bold mb-1">Overview</h1>
      <p className="text-muted text-sm mb-6">Platform-wide stats at a glance.</p>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatTile icon={Users} label="Users" value={stats.users} accent="#22d3ee" />
          <StatTile icon={UserCheck} label="Active now" value={stats.activeUsers} accent="#22c55e" />
          <StatTile icon={Video} label="Videos" value={stats.videos} accent="#8b5cf6" />
          <StatTile icon={Eye} label="Total Views" value={stats.views} accent="#3b82f6" />
          <StatTile icon={Flag} label="Reports (pending)" value={stats.pendingReports} accent="#f43f5e" />
          <StatTile icon={DollarSign} label="Revenue" value={stats.revenue} accent="#f59e0b" />
        </div>
      )}
    </div>
  );
}
