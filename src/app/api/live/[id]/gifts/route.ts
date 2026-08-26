import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk, checkRateLimit } from "@/lib/api";
import { getOrCreateWallet } from "@/lib/wallet";
import { pushLiveEvent } from "@/lib/live-chat";
import { logLiveEvent } from "@/lib/live-events";

const schema = z.object({ giftId: z.string().min(1), quantity: z.number().int().min(1).max(99).default(1) });

export const POST = withAuth<{ id: string }>(async (req, { user, params }) => {
  if (!checkRateLimit(req, "live-gift", 30, 60_000)) return jsonError("Too many gifts sent — slow down a moment", 429);

  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return jsonError("Live stream not found", 404);
  if (stream.status !== "live") return jsonError("This live has ended", 400);
  if (!stream.giftsEnabled) return jsonError("Gifts are turned off for this live", 403);
  if (stream.userId === user.id) return jsonError("You can't gift your own live", 400);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid gift", 422);

  const gift = await prisma.gift.findUnique({ where: { id: parsed.data.giftId } });
  if (!gift) return jsonError("This gift isn't available", 404);

  const totalCost = gift.coinCost * parsed.data.quantity;
  await getOrCreateWallet(user.id);
  await getOrCreateWallet(stream.userId);

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      // Never trust a client-sent balance — decrement is conditional on the
      // server's own row, atomically, inside the transaction.
      const debited = await tx.userWallet.updateMany({
        where: { userId: user.id, balance: { gte: totalCost } },
        data: { balance: { decrement: totalCost } },
      });
      if (debited.count === 0) throw new Error("INSUFFICIENT_BALANCE");

      await tx.userWallet.update({ where: { userId: stream.userId }, data: { balance: { increment: totalCost } } });
      await tx.liveStream.update({ where: { id: stream.id }, data: { coinsEarned: { increment: totalCost } } });

      return tx.giftTransaction.create({
        data: {
          senderId: user.id,
          recipientId: stream.userId,
          liveStreamId: stream.id,
          giftId: gift.id,
          quantity: parsed.data.quantity,
          coinAmount: totalCost,
        },
      });
    });

    pushLiveEvent(stream.id, {
      type: "gift",
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      giftName: gift.name,
      giftEmoji: gift.emoji,
      quantity: parsed.data.quantity,
    });
    logLiveEvent(stream.id, "LIVE_GIFT", user.id, { giftId: gift.id, quantity: parsed.data.quantity, coinAmount: totalCost });

    return jsonOk({ transaction }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return jsonError("Not enough coins for this gift", 402);
    }
    throw err;
  }
});
