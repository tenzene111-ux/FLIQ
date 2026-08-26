// Ephemeral in-memory live chat/reactions/gifts, keyed by stream id. Live
// chat is inherently transient (matches real livestream behavior) so this
// avoids a dedicated persisted table; messages are lost when the stream ends
// or the server restarts. In a real production deployment this map would be
// swapped for Redis (or a pub/sub-backed store) so it works across multiple
// server instances — documented here rather than pretended away.

export interface LiveEvent {
  id: string;
  type: "chat" | "reaction" | "join" | "gift";
  userId: string;
  username: string;
  avatarUrl: string | null;
  text?: string;
  emoji?: string;
  giftName?: string;
  giftEmoji?: string;
  quantity?: number;
  deleted?: boolean;
  createdAt: number;
}

const streams = new Map<string, LiveEvent[]>();
const pinned = new Map<string, LiveEvent>();
const lastMessageAt = new Map<string, number>(); // key: `${streamId}:${userId}`
let counter = 0;

export function pushLiveEvent(streamId: string, event: Omit<LiveEvent, "id" | "createdAt">) {
  const list = streams.get(streamId) ?? [];
  const full: LiveEvent = { ...event, id: `${Date.now()}-${counter++}`, createdAt: Date.now() };
  list.push(full);
  if (list.length > 300) list.splice(0, list.length - 300);
  streams.set(streamId, list);
  return full;
}

export function getLiveEventsSince(streamId: string, sinceId?: string | null): LiveEvent[] {
  const list = streams.get(streamId) ?? [];
  if (!sinceId) return list.slice(-50);
  const idx = list.findIndex((e) => e.id === sinceId);
  return idx === -1 ? list.slice(-50) : list.slice(idx + 1);
}

export function deleteLiveEvent(streamId: string, eventId: string): boolean {
  const list = streams.get(streamId);
  const event = list?.find((e) => e.id === eventId);
  if (!event) return false;
  event.deleted = true;
  event.text = undefined;
  if (pinned.get(streamId)?.id === eventId) pinned.delete(streamId);
  return true;
}

export function setPinnedMessage(streamId: string, eventId: string): LiveEvent | null {
  const list = streams.get(streamId) ?? [];
  const event = list.find((e) => e.id === eventId && e.type === "chat" && !e.deleted);
  if (!event) return null;
  pinned.set(streamId, event);
  return event;
}

export function clearPinnedMessage(streamId: string) {
  pinned.delete(streamId);
}

export function getPinnedMessage(streamId: string): LiveEvent | null {
  return pinned.get(streamId) ?? null;
}

/** Slow-mode check: true if the user may post now, given the stream's configured cooldown. */
export function canPostMessage(streamId: string, userId: string, slowModeSeconds: number): boolean {
  if (slowModeSeconds <= 0) return true;
  const key = `${streamId}:${userId}`;
  const last = lastMessageAt.get(key);
  if (last && Date.now() - last < slowModeSeconds * 1000) return false;
  lastMessageAt.set(key, Date.now());
  return true;
}

export function clearLiveEvents(streamId: string) {
  streams.delete(streamId);
  pinned.delete(streamId);
  pendingReactions.delete(streamId);
  for (const key of lastMessageAt.keys()) {
    if (key.startsWith(`${streamId}:`)) lastMessageAt.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Reaction batching — reactions can be extremely high-frequency, so instead
// of one DB write per tap they're aggregated in memory and flushed to the
// LiveStream.reactionCount column on an interval. Swap this for a proper
// aggregation pipeline (e.g. Redis INCR + a scheduled flush job) in
// production, where a single Node process can't be assumed.
// ---------------------------------------------------------------------------

const pendingReactions = new Map<string, number>();

export function bumpPendingReactionCount(streamId: string) {
  pendingReactions.set(streamId, (pendingReactions.get(streamId) ?? 0) + 1);
}

export function drainPendingReactionCounts(): Map<string, number> {
  const drained = new Map(pendingReactions);
  pendingReactions.clear();
  return drained;
}

declare global {
  var __fliqLiveReactionFlushTimer: ReturnType<typeof setInterval> | undefined;
}

export function ensureReactionFlushTimer(flush: (counts: Map<string, number>) => void) {
  if (globalThis.__fliqLiveReactionFlushTimer) return;
  globalThis.__fliqLiveReactionFlushTimer = setInterval(() => {
    const counts = drainPendingReactionCounts();
    if (counts.size > 0) flush(counts);
  }, 3000);
}
