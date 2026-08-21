// Ephemeral in-memory live chat/reactions, keyed by stream id. Live chat is
// inherently transient (matches real livestream behavior) so this avoids a
// dedicated persisted table; messages are lost when the stream ends or the
// server restarts.

export interface LiveEvent {
  id: string;
  type: "chat" | "reaction" | "join";
  userId: string;
  username: string;
  avatarUrl: string | null;
  text?: string;
  emoji?: string;
  createdAt: number;
}

const streams = new Map<string, LiveEvent[]>();
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

export function clearLiveEvents(streamId: string) {
  streams.delete(streamId);
}
