"use client";

import { useState } from "react";
import { Link2, Send } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { SendToSheet, type ShareKind } from "@/components/share/SendToSheet";
import { toast } from "@/store/toast";

/** Copy-link + "Send to..." menu for sharing a profile, hashtag, sound, or LIVE room. */
export function ShareMenuSheet({
  open,
  onClose,
  kind,
  id,
  url,
  title = "Share",
}: {
  open: boolean;
  onClose: () => void;
  kind: ShareKind;
  id: string;
  url: string;
  title?: string;
}) {
  const [sendToOpen, setSendToOpen] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link copied to clipboard");
    } catch {
      toast("info", url);
    }
    onClose();
  }

  return (
    <>
      <Sheet open={open && !sendToOpen} onClose={onClose} title={title}>
        <div className="px-4 pb-4 flex gap-4">
          <ShareAction icon={Send} label="Send to..." onClick={() => setSendToOpen(true)} />
          <ShareAction icon={Link2} label="Copy link" onClick={copyLink} />
        </div>
      </Sheet>
      <SendToSheet
        open={sendToOpen}
        onClose={() => {
          setSendToOpen(false);
          onClose();
        }}
        kind={kind}
        id={id}
      />
    </>
  );
}

function ShareAction({ icon: Icon, label, onClick }: { icon: typeof Link2; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 shrink-0 w-16">
      <span className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center text-white">
        <Icon size={20} />
      </span>
      <span className="text-[11px] text-muted text-center leading-tight">{label}</span>
    </button>
  );
}
