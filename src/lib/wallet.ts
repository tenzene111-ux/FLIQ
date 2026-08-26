import { prisma } from "@/lib/db";

// Closed-loop demo currency — there's no payment processor, so balances only
// ever move between users (gifts) or start from the one-time signup grant.
const STARTER_BALANCE = 500;

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.userWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userWallet.upsert({
    where: { userId },
    create: { userId, balance: STARTER_BALANCE },
    update: {},
  });
}

const DEFAULT_GIFTS: { name: string; emoji: string; coinCost: number }[] = [
  { name: "Rose", emoji: "🌹", coinCost: 10 },
  { name: "Heart", emoji: "❤️", coinCost: 20 },
  { name: "Fire", emoji: "🔥", coinCost: 50 },
  { name: "Star", emoji: "🌟", coinCost: 100 },
  { name: "Crown", emoji: "👑", coinCost: 500 },
  { name: "Rocket", emoji: "🚀", coinCost: 1000 },
];

export async function getGiftCatalog() {
  const existing = await prisma.gift.findMany({ orderBy: { coinCost: "asc" } });
  if (existing.length > 0) return existing;
  await prisma.gift.createMany({ data: DEFAULT_GIFTS, skipDuplicates: true });
  return prisma.gift.findMany({ orderBy: { coinCost: "asc" } });
}
