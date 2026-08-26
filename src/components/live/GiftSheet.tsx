"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Coins } from "lucide-react";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
}

export function GiftSheet({ open, onClose, liveId, onSent }: { open: boolean; onClose: () => void; liveId: string; onSent: () => void }) {
  const [gifts, setGifts] = useState<GiftItem[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/gifts")
      .then((r) => r.json())
      .then((d) => setGifts(d.gifts || []))
      .catch(() => setGifts([]));
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance))
      .catch(() => setBalance(0));
  }, [open]);

  async function send(gift: GiftItem) {
    setSending(gift.id);
    const res = await fetch(`/api/live/${liveId}/gifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giftId: gift.id, quantity: 1 }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(null);
    if (res?.ok) {
      setBalance((b) => (b !== null ? b - gift.coinCost : b));
      onSent();
      onClose();
    } else {
      toast("error", data?.error || "Couldn't send gift");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Send a gift" heightClass="h-[60vh]">
      <div className="px-4 pb-3 flex items-center gap-1.5 text-warning text-sm font-semibold">
        <Coins size={15} /> {balance ?? "…"} coins
      </div>
      {gifts === null ? (
        <div className="px-4 text-muted-2 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4">
          {gifts.map((g) => {
            const affordable = balance === null || balance >= g.coinCost;
            return (
              <button
                key={g.id}
                onClick={() => affordable && send(g)}
                disabled={!affordable || sending === g.id}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border border-border py-3",
                  affordable ? "hover:bg-white/5" : "opacity-40"
                )}
              >
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-white text-xs font-medium">{g.name}</span>
                <span className="text-warning text-[11px] flex items-center gap-0.5">
                  <Coins size={10} /> {g.coinCost}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
