"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { REPORT_REASONS } from "@/lib/constants";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

export function ReportSheet({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "video" | "user" | "comment" | "message";
  targetId: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      toast("error", "Couldn't submit your report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setDone(false);
      setReason(null);
    }, 300);
  }

  return (
    <Sheet open={open} onClose={handleClose} title={done ? "Thanks for reporting" : `Report ${targetType}`}>
      {done ? (
        <div className="px-4 py-8 text-center">
          <p className="text-white font-medium">We&apos;ve received your report.</p>
          <p className="text-muted text-sm mt-1.5">Our team will review it and take action if it violates our guidelines.</p>
          <Button className="mt-5" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-muted text-sm mb-3">Why are you reporting this?</p>
          <div className="flex flex-col gap-1">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={cn(
                  "flex items-center justify-between text-left px-3.5 py-3 rounded-xl border transition-colors",
                  reason === r.value ? "border-fliq-magenta/60 bg-gradient-brand-soft" : "border-border hover:bg-white/5"
                )}
              >
                <span className="text-sm text-white">{r.label}</span>
                <span
                  className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0",
                    reason === r.value ? "border-fliq-magenta bg-fliq-magenta" : "border-muted-2"
                  )}
                />
              </button>
            ))}
          </div>
          <Button fullWidth className="mt-4" disabled={!reason} loading={submitting} onClick={submit}>
            Submit report
          </Button>
        </div>
      )}
    </Sheet>
  );
}
