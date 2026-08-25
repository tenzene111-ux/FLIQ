import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getStorage, MAX_VIDEO_BYTES } from "@/lib/storage";
import { extractHashtags, extractMentions } from "@/lib/utils";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

export const POST = withAuth(async (req, { user }) => {
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Invalid form submission", 422);

  const file = form.get("video");
  if (!(file instanceof File)) return jsonError("A video file is required", 422);
  if (file.size === 0) return jsonError("The video file is empty", 422);
  if (file.size > MAX_VIDEO_BYTES) return jsonError("Video is too large (max 200MB)", 413);

  const caption = String(form.get("caption") || "").slice(0, 2200);
  const location = form.get("location") ? String(form.get("location")).slice(0, 100) : null;
  const privacy = ["everyone", "followers", "onlyMe"].includes(String(form.get("privacy"))) ? String(form.get("privacy")) : "everyone";
  const allowComments = form.get("allowComments") !== "false";
  const allowDuet = form.get("allowDuet") !== "false";
  const allowDownload = form.get("allowDownload") !== "false";
  const soundId = form.get("soundId") ? String(form.get("soundId")) : null;
  const cover = form.get("cover") ? String(form.get("cover")) : null;
  const duration = Math.max(1, Math.round(Number(form.get("duration")) || 15));
  const status = String(form.get("status")) === "draft" ? "draft" : "published";

  let duetOfId: string | undefined;
  const requestedDuetOfId = form.get("duetOfId") ? String(form.get("duetOfId")) : null;
  if (requestedDuetOfId) {
    const original = await prisma.video.findUnique({ where: { id: requestedDuetOfId } });
    if (original && original.status === "published" && original.allowDuet) {
      duetOfId = original.id;
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("mp4") ? "mp4" : "webm";
  const { url: videoUrl } = await getStorage().upload(buffer, { folder: "videos", ext, contentType: file.type || "video/webm" });

  const hashtagTags = extractHashtags(caption);
  const mentionUsernames = extractMentions(caption);

  const video = await prisma.video.create({
    data: {
      userId: user.id,
      caption,
      videoUrl,
      thumbnailUrl: cover || "",
      duration,
      location,
      privacy,
      allowComments,
      allowDuet,
      allowDownload,
      soundId: soundId || undefined,
      status,
      duetOfId,
      analytics: { create: {} },
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

  if (status === "published" && mentionUsernames.length) {
    const mentioned = await prisma.user.findMany({ where: { username: { in: mentionUsernames } } });
    for (const m of mentioned) {
      if (m.id === user.id) continue;
      await prisma.notification.create({ data: { recipientId: m.id, actorId: user.id, type: "mention", videoId: video.id } });
    }
  }

  const followingIds = await getFollowingIdSet(user.id);
  return jsonOk({ video: serializeVideo(video, followingIds) }, 201);
});
