import { formatCount } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatTile({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5 flex flex-col gap-2">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}22` }}>
        <Icon size={15} style={{ color: accent }} />
      </span>
      <div>
        <p className="text-white text-lg font-bold tabular-nums">{formatCount(value)}</p>
        <p className="text-muted-2 text-xs">{label}</p>
      </div>
    </div>
  );
}
