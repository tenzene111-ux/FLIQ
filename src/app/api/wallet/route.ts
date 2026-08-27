import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api";
import { getOrCreateWallet } from "@/lib/wallet";

export const GET = withAuth(async (_req, { user }) => {
  const [wallet, earned, spent] = await Promise.all([
    getOrCreateWallet(user.id),
    prisma.giftTransaction.aggregate({ where: { recipientId: user.id }, _sum: { coinAmount: true } }),
    prisma.giftTransaction.aggregate({ where: { senderId: user.id }, _sum: { coinAmount: true } }),
  ]);
  return jsonOk({
    balance: wallet.balance,
    totalEarned: earned._sum.coinAmount ?? 0,
    totalSpent: spent._sum.coinAmount ?? 0,
  });
});
