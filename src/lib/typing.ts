// In-memory "is typing" signal, keyed by conversationId -> userId -> expiry.
// Polling-based (no websockets) but genuinely reflects real client input
// events across two real browser sessions.

const typing = new Map<string, Map<string, number>>();
const TTL_MS = 4000;

export function setTyping(conversationId: string, userId: string) {
  const bucket = typing.get(conversationId) ?? new Map();
  bucket.set(userId, Date.now() + TTL_MS);
  typing.set(conversationId, bucket);
}

export function getTypingUsers(conversationId: string, excludeUserId: string): string[] {
  const bucket = typing.get(conversationId);
  if (!bucket) return [];
  const now = Date.now();
  return [...bucket.entries()].filter(([uid, exp]) => uid !== excludeUserId && exp > now).map(([uid]) => uid);
}
