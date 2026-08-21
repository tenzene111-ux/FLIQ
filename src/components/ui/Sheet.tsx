"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  children,
  heightClass = "max-h-[75vh]",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  heightClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full sm:max-w-md glass-strong rounded-t-3xl flex flex-col animate-sheet-up safe-bottom",
          heightClass
        )}
      >
        <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0">
            <h2 className="text-white font-semibold text-base">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-2 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 no-scrollbar">{children}</div>
      </div>
    </div>,
    document.body
  );
}
