import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getOrCreateDirectConversation } from "@/lib/messaging";

const schema = z.object({
  kind: z.enum(["video", "profile", "hashtag", "sound", "live"]),
  id: z.string().min(1),
  toUsernames: z.array(z.string()).min(1).max(20),
});

// Shares a video/photo post, profile, hashtag, sound, or LIVE room as a real
// rich-preview message into one or more direct conversations (creating them
// if needed, subject to the same privacy rules as starting a DM normally).
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid share request", 422);
  const { kind, id, toUsernames } = parsed.data;

  let messageData: { type: string; sharedVideoId?: string; sharedUserId?: string; sharedHashtagId?: string; sharedSoundId?: string; sharedLiveId?: string };
  let videoOwnerId: string | null = null;

  if (kind === "video") {
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return jsonError("Post not found", 404);
    messageData = { type: "post", sharedVideoId: video.id };
    videoOwnerId = video.userId;
  } else if (kind === "profile") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return jsonError("Profile not found", 404);
    messageData = { type: "profile", sharedUserId: target.id };
  } else if (kind === "hashtag") {
    const hashtag = await prisma.hashtag.findUnique({ where: { tag: id.replace(/^#/, "").toLowerCase() } });
    if (!hashtag) return jsonError("Hashtag not found", 404);
    messageData = { type: "hashtag", sharedHashtagId: hashtag.id };
  } else if (kind === "sound") {
    const sound = await prisma.sound.findUnique({ where: { id } });
    if (!sound) return jsonError("Sound not found", 404);
    messageData = { type: "sound", sharedSoundId: sound.id };
  } else {
    const live = await prisma.liveStream.findUnique({ where: { id } });
    if (!live) return jsonError("Live stream not found", 404);
    messageData = { type: "live", sharedLiveId: live.id };
  }

  let sentCount = 0;
  for (const username of toUsernames) {
    const gate = await getOrCreateDirectConversation(user.id, username);
    if (!gate.ok) continue;
    await prisma.message.create({ data: { conversationId: gate.conversationId, senderId: user.id, ...messageData } });
    await prisma.conversation.update({ where: { id: gate.conversationId }, data: { updatedAt: new Date() } });
    sentCount++;
  }

  if (sentCount === 0) return jsonError("Couldn't send to any of the selected people", 422);

  if (kind === "video" && videoOwnerId && videoOwnerId !== user.id) {
    await prisma.share.create({ data: { userId: user.id, videoId: id, target: "fliq_user" } }).catch(() => {});
    await prisma.notification.create({ data: { recipientId: videoOwnerId, actorId: user.id, type: "share", videoId: id } });
  }

  return jsonOk({ sentCount });
});
