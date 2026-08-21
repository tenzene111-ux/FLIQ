"use client";

import { useToastStore } from "@/store/toast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[min(92vw,380px)]"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "glass-strong rounded-xl px-3.5 py-3 flex items-start gap-2.5 shadow-2xl animate-sheet-up",
              t.kind === "error" && "border-danger/40",
              t.kind === "success" && "border-success/40"
            )}
          >
            <Icon
              size={18}
              className={cn(
                "shrink-0 mt-0.5",
                t.kind === "success" && "text-success",
                t.kind === "error" && "text-danger",
                t.kind === "info" && "text-fliq-cyan"
              )}
            />
            <p className="text-sm text-white flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-muted-2 hover:text-white shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
