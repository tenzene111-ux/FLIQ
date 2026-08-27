import { prisma } from "@/lib/db";

// Coins move via gifts (peer-to-peer), the one-time starter grant, or a real
// Stripe purchase (CoinPurchase) — there's still no cash-out/withdrawal path.
export const STARTER_BALANCE = 500;

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

const DEFAULT_COIN_PACKAGES: { name: string; coinAmount: number; priceCents: number; sortOrder: number }[] = [
  { name: "Starter", coinAmount: 100, priceCents: 99, sortOrder: 0 },
  { name: "Popular", coinAmount: 550, priceCents: 499, sortOrder: 1 },
  { name: "Value", coinAmount: 1200, priceCents: 999, sortOrder: 2 },
  { name: "Plus", coinAmount: 2600, priceCents: 1999, sortOrder: 3 },
  { name: "Mega", coinAmount: 7000, priceCents: 4999, sortOrder: 4 },
];

export async function getCoinPackages() {
  const existing = await prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  if (existing.length > 0) return existing;
  await prisma.coinPackage.createMany({ data: DEFAULT_COIN_PACKAGES });
  return prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
}
