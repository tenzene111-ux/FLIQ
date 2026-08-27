"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Coins, ArrowDownLeft, ArrowUpRight, Gift as GiftIcon, Info, Plus } from "lucide-react";
import { formatCount, formatTimeAgo } from "@/lib/utils";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";

interface PersonBrief {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

type HistoryItem =
  | {
      id: string;
      kind: "gift";
      direction: "sent" | "received";
      otherUser: PersonBrief;
      gift: { name: string; emoji: string };
      quantity: number;
      coinAmount: number;
      liveStream: { id: string; title: string; status: string } | null;
      createdAt: string;
    }
  | {
      id: string;
      kind: "purchase";
      packageName: string;
      coinAmount: number;
      priceCents: number;
      currency: string;
      createdAt: string;
    };

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  priceCents: number;
  currency: string;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function WalletPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<HistoryItem[] | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[] | null>(null);
  const [purchasesEnabled, setPurchasesEnabled] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  function load() {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.balance);
        setTotalEarned(d.totalEarned);
        setTotalSpent(d.totalSpent);
      })
      .catch(() => setBalance(0));

    fetch("/api/wallet/transactions")
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions || []);
        setNextOffset(d.nextOffset);
      })
      .catch(() => setTransactions([]));
  }

  useEffect(load, []);

  useEffect(() => {
    fetch("/api/wallet/packages")
      .then((r) => r.json())
      .then((d) => {
        setPackages(d.packages || []);
        setPurchasesEnabled(d.purchasesEnabled);
      })
      .catch(() => setPackages([]));
  }, []);

  useEffect(() => {
    const status = searchParams.get("purchase");
    if (!status) return;
    if (status === "success") {
      toast("success", "Payment received — crediting your coins now...");
      setTimeout(load, 2000); // webhook may land a beat after the redirect
    } else if (status === "cancelled") {
      toast("info", "Purchase cancelled");
    }
    router.replace("/settings/wallet");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadMore() {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    const data = await fetch(`/api/wallet/transactions?offset=${nextOffset}`)
      .then((r) => r.json())
      .catch(() => null);
    if (data) {
      setTransactions((prev) => [...(prev ?? []), ...data.transactions]);
      setNextOffset(data.nextOffset);
    }
    setLoadingMore(false);
  }

  async function buy(pkg: CoinPackage) {
    setBuying(pkg.id);
    const res = await fetch("/api/wallet/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBuying(null);
    if (res?.ok && data?.url) {
      window.location.assign(data.url);
    } else {
      toast("error", data?.error || "Couldn't start checkout");
    }
  }

  return (
    <SettingsSubpage title="Coin Wallet">
      <div className="px-4">
        <div className="rounded-2xl bg-gradient-brand-diag p-5 flex flex-col items-center text-center">
          <span className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide">
            <Coins size={14} /> Your balance
          </span>
          <p className="text-white text-4xl font-bold mt-2">{balance === null ? "…" : formatCount(balance)}</p>
          <p className="text-white/70 text-xs mt-1">Fliq Coins</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl border border-border bg-surface-2 px-3 py-3 flex flex-col items-center gap-1">
            <ArrowDownLeft size={16} className="text-success" />
            <span className="text-white font-bold text-sm">{formatCount(totalEarned)}</span>
            <span className="text-muted-2 text-[10px]">Lifetime earned</span>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 px-3 py-3 flex flex-col items-center gap-1">
            <ArrowUpRight size={16} className="text-danger" />
            <span className="text-white font-bold text-sm">{formatCount(totalSpent)}</span>
            <span className="text-muted-2 text-[10px]">Lifetime spent</span>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-4 rounded-xl bg-surface-2 border border-border px-3 py-3">
          <Info size={14} className="text-muted-2 shrink-0 mt-0.5" />
          <p className="text-muted-2 text-[11px] leading-snug">
            Fliq Coins can be purchased with real money below, earned by receiving gifts during your LIVEs, or spent sending
            gifts to other creators. Coins can&apos;t be withdrawn or exchanged back into cash.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="px-4 text-xs font-semibold text-muted-2 uppercase tracking-wide mb-1.5">Buy Coins</p>
        {!purchasesEnabled ? (
          <p className="px-4 text-muted-2 text-xs">Coin purchases aren&apos;t set up yet.</p>
        ) : packages === null ? (
          <div className="grid grid-cols-2 gap-3 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => buy(pkg)}
                disabled={buying !== null}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border border-border py-4 hover:bg-white/5 disabled:opacity-50"
                )}
              >
                <span className="flex items-center gap-1 text-white font-bold text-lg">
                  <Coins size={16} className="text-warning" /> {formatCount(pkg.coinAmount)}
                </span>
                <span className="text-muted-2 text-[11px]">{pkg.name}</span>
                <span className="mt-1 text-xs font-semibold text-fliq-cyan flex items-center gap-1">
                  {buying === pkg.id ? "..." : formatPrice(pkg.priceCents, pkg.currency)}
                  {buying !== pkg.id && <Plus size={11} />}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="px-4 text-xs font-semibold text-muted-2 uppercase tracking-wide mb-1.5">History</p>

        {transactions === null ? (
          Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)
        ) : transactions.length === 0 ? (
          <EmptyState icon={GiftIcon} title="No transactions yet" description="Purchases and gifts you send or receive will show up here." />
        ) : (
          <>
            <div className="flex flex-col">
              {transactions.map((t) => (
                <HistoryRow key={`${t.kind}-${t.id}`} t={t} />
              ))}
            </div>
            {nextOffset !== null && (
              <div className="px-4 py-3">
                <Button variant="secondary" size="sm" fullWidth loading={loadingMore} onClick={loadMore}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsSubpage>
  );
}

function HistoryRow({ t }: { t: HistoryItem }) {
  if (t.kind === "purchase") {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
          <Plus size={16} className="text-success" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm">
            Bought {t.packageName} <span className="text-muted-2">({formatPrice(t.priceCents, t.currency)})</span>
          </p>
          <p className="text-muted-2 text-xs mt-0.5">{formatTimeAgo(t.createdAt)}</p>
        </div>
        <span className="text-sm font-bold shrink-0 flex items-center gap-1 text-success">
          +{formatCount(t.coinAmount)}
          <Coins size={13} />
        </span>
      </div>
    );
  }

  const sent = t.direction === "sent";
  const row = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-xl shrink-0">{t.gift.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm">
          {sent ? "Sent" : "Received"} {t.gift.name}
          {t.quantity > 1 ? ` × ${t.quantity}` : ""} {sent ? "to" : "from"}{" "}
          <span className="font-semibold">@{t.otherUser.username}</span>
        </p>
        <p className="text-muted-2 text-xs mt-0.5">
          {t.liveStream ? `${t.liveStream.title} · ` : ""}
          {formatTimeAgo(t.createdAt)}
        </p>
      </div>
      <span className={cn("text-sm font-bold shrink-0 flex items-center gap-1", sent ? "text-danger" : "text-success")}>
        {sent ? "-" : "+"}
        {formatCount(t.coinAmount)}
        <Coins size={13} />
      </span>
    </div>
  );

  if (t.liveStream && t.liveStream.status === "live") {
    return (
      <Link href={`/live/${t.liveStream.id}`} className="hover:bg-white/5">
        {row}
      </Link>
    );
  }
  return (
    <Link href={`/profile/${t.otherUser.username}`} className="hover:bg-white/5">
      {row}
    </Link>
  );
}

export default function WalletPage() {
  return (
    <Suspense>
      <WalletPageInner />
    </Suspense>
  );
}
