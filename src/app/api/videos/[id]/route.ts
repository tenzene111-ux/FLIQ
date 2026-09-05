import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, withErrorHandling, withAuth } from "@/lib/api";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";
import { extractHashtags, extractMentions } from "@/lib/utils";

export const GET = withErrorHandling<{ id: string }>(async (_req, { params }) => {
  const viewer = await getCurrentUser();
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: videoInclude(viewer?.id) });
  if (!video || video.status === "removed") return jsonError("This video isn't available", 404);
  if (video.status === "draft" && video.userId !== viewer?.id) return jsonError("This video isn't available", 404);
  if (video.privacy === "onlyMe" && video.userId !== viewer?.id) return jsonError("This video isn't available", 404);

  const followingIds = await getFollowingIdSet(viewer?.id);
  if (video.privacy === "followers" && video.userId !== viewer?.id && !followingIds.has(video.userId)) {
    return jsonError("This video is only visible to followers", 403);
  }

  return jsonOk({ video: serializeVideo(video, followingIds) });
});

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return jsonError("Video not found", 404);
  if (video.userId !== user.id) return jsonError("You can only delete your own videos", 403);

  await prisma.video.delete({ where: { id: video.id } });
  return jsonOk({ ok: true });
});

/** Edits a draft's fields, and/or publishes it (draft -> published). */
export const PATCH = withAuth<{ id: string }>(async (req: NextRequest, { user, params }) => {
  const existing = await prisma.video.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Video not found", 404);
  if (existing.userId !== user.id) return jsonError("You can only edit your own videos", 403);
  if (existing.status !== "draft") return jsonError("Only drafts can be edited this way", 400);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 422);

  const caption = typeof body.caption === "string" ? body.caption.slice(0, 2200) : existing.caption;
  const location = typeof body.location === "string" ? body.location.slice(0, 100) || null : existing.location;
  const privacy = ["everyone", "followers", "onlyMe"].includes(body.privacy) ? body.privacy : existing.privacy;
  const allowComments = typeof body.allowComments === "boolean" ? body.allowComments : existing.allowComments;
  const allowDuet = typeof body.allowDuet === "boolean" ? body.allowDuet : existing.allowDuet;
  const allowStitch = typeof body.allowStitch === "boolean" ? body.allowStitch : existing.allowStitch;
  const allowDownload = typeof body.allowDownload === "boolean" ? body.allowDownload : existing.allowDownload;
  const allowSoundReuse = typeof body.allowSoundReuse === "boolean" ? body.allowSoundReuse : existing.allowSoundReuse;
  const allowReuse = typeof body.allowReuse === "boolean" ? body.allowReuse : existing.allowReuse;
  const publish = body.status === "published";

  const hashtagTags = extractHashtags(caption);
  await prisma.videoHashtag.deleteMany({ where: { videoId: existing.id } });

  const video = await prisma.video.update({
    where: { id: existing.id },
    data: {
      caption,
      location,
      privacy,
      allowComments,
      allowDuet,
      allowStitch,
      allowDownload,
      allowSoundReuse,
      allowReuse,
      status: publish ? "published" : "draft",
      hashtags: {
        create: await Promise.all(
          hashtagTags.map(async (tag) => {
            const hashtag = await prisma.hashtag.upsert({
              where: { tag },
              create: { tag },
              update: { viewCount: { increment: 1 } },
            });
            return { hashtagId: hashtag.id };
          })
        ),
      },
    },
    include: videoInclude(user.id),
  });

  if (publish) {
    const mentionUsernames = extractMentions(caption);
    if (mentionUsernames.length) {
      const mentioned = await prisma.user.findMany({ where: { username: { in: mentionUsernames } } });
      for (const m of mentioned) {
        if (m.id === user.id) continue;
        await prisma.notification.create({ data: { recipientId: m.id, actorId: user.id, type: "mention", videoId: video.id } });
      }
    }
  }

  let finalVideo = video;
  if (publish && video.postType === "video" && !video.soundId && allowSoundReuse && video.videoUrl) {
    const originalSound = await prisma.sound.create({
      data: {
        title: "original sound",
        artist: user.displayName,
        coverUrl: video.thumbnailUrl,
        audioUrl: video.videoUrl,
        duration: video.duration,
        isOriginal: true,
        ownerId: user.id,
      },
    });
    finalVideo = await prisma.video.update({
      where: { id: video.id },
      data: { soundId: originalSound.id },
      include: videoInclude(user.id),
    });
  }

  const followingIds = await getFollowingIdSet(user.id);
  return jsonOk({ video: serializeVideo(finalVideo, followingIds) });
});
