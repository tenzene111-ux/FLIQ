// In-memory presence tracker (per server process). A user is considered
// "online" if one of their authenticated requests touched this within the
// last few minutes. Resets on restart — fine for a single-instance demo;
// swap for a Redis TTL key behind the same two functions in production.

const lastSeen = new Map<string, number>();
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export function touchPresence(userId: string) {
  lastSeen.set(userId, Date.now());
}

export function isOnline(userId: string): boolean {
  const t = lastSeen.get(userId);
  return !!t && Date.now() - t < ONLINE_WINDOW_MS;
}

export function getLastSeen(userId: string): number | null {
  return lastSeen.get(userId) ?? null;
}
