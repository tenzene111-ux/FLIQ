"use client";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

/** Shown when leaving the camera/editor/photo picker with unsaved work. */
export function DraftExitSheet({
  open,
  onClose,
  onSave,
  onDiscard,
  saving,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
  kind: "video" | "photos";
}) {
  return (
    <Sheet open={open} onClose={saving ? () => {} : onClose} title="Save your progress?">
      <div className="px-4 pb-4 flex flex-col gap-2">
        <p className="text-muted text-sm -mt-1 mb-1">
          You have an unfinished {kind === "photos" ? "photo post" : "video"}. Save it to your drafts before leaving?
        </p>
        <Button fullWidth onClick={onSave} loading={saving}>
          Save as Draft
        </Button>
        <Button fullWidth variant="secondary" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
        <Button fullWidth variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
