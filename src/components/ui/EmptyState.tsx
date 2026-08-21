import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-8 py-16 gap-3", className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-1">
        <Icon size={28} className="text-muted-2" />
      </div>
      <p className="text-white font-semibold text-base">{title}</p>
      {description && <p className="text-muted text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
