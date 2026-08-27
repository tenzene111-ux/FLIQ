import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

const PAGE_SIZE = 30;

type HistoryItem =
  | {
      id: string;
      kind: "gift";
      direction: "sent" | "received";
      otherUser: unknown;
      gift: { name: string; emoji: string };
      quantity: number;
      coinAmount: number;
      liveStream: { id: string; title: string; status: string } | null;
      createdAt: Date;
    }
  | {
      id: string;
      kind: "purchase";
      packageName: string;
      coinAmount: number;
      priceCents: number;
      currency: string;
      createdAt: Date;
    };

export const GET = withAuth(async (req, { user }) => {
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);
  const fetchLimit = offset + PAGE_SIZE;

  const [giftRows, purchaseRows] = await Promise.all([
    prisma.giftTransaction.findMany({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      include: {
        sender: { select: PUBLIC_USER_SELECT },
        recipient: { select: PUBLIC_USER_SELECT },
        gift: { select: { name: true, emoji: true } },
        liveStream: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
    prisma.coinPurchase.findMany({
      where: { userId: user.id, status: "completed" },
      include: { package: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
  ]);

  const merged: HistoryItem[] = [
    ...giftRows.map((t) => ({
      id: t.id,
      kind: "gift" as const,
      direction: (t.senderId === user.id ? "sent" : "received") as "sent" | "received",
      otherUser: t.senderId === user.id ? t.recipient : t.sender,
      gift: t.gift,
      quantity: t.quantity,
      coinAmount: t.coinAmount,
      liveStream: t.liveStream,
      createdAt: t.createdAt,
    })),
    ...purchaseRows.map((p) => ({
      id: p.id,
      kind: "purchase" as const,
      packageName: p.package.name,
      coinAmount: p.coinAmount,
      priceCents: p.priceCents,
      currency: p.currency,
      createdAt: p.completedAt ?? p.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const page = merged.slice(offset, offset + PAGE_SIZE);
  const transactions = page.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }));

  return jsonOk({ transactions, nextOffset: merged.length > offset + PAGE_SIZE ? offset + PAGE_SIZE : null });
});
