import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { PUBLIC_USER_SELECT } from "@/lib/auth";

const PAGE_SIZE = 30;

export const GET = withAuth(async (req, { user }) => {
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);

  const rows = await prisma.giftTransaction.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    include: {
      sender: { select: PUBLIC_USER_SELECT },
      recipient: { select: PUBLIC_USER_SELECT },
      gift: { select: { name: true, emoji: true } },
      liveStream: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: PAGE_SIZE,
  });

  const transactions = rows.map((t) => ({
    id: t.id,
    direction: t.senderId === user.id ? "sent" : "received",
    otherUser: t.senderId === user.id ? t.recipient : t.sender,
    gift: t.gift,
    quantity: t.quantity,
    coinAmount: t.coinAmount,
    liveStream: t.liveStream,
    createdAt: t.createdAt.toISOString(),
  }));

  return jsonOk({ transactions, nextOffset: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null });
});
