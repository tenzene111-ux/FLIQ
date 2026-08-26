import { prisma } from "@/lib/db";
import { withAuth, jsonError, jsonOk } from "@/lib/api";
import { getStorage, MAX_VIDEO_BYTES, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { extractHashtags, extractMentions } from "@/lib/utils";
import { videoInclude, serializeVideo } from "@/lib/serialize";
import { getFollowingIdSet } from "@/lib/social";

const MAX_PHOTOS = 10;

export const POST = withAuth(async (req, { user }) => {
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Invalid form submission", 422);

  const postType = String(form.get("postType")) === "photo" ? "photo" : "video";

  const caption = String(form.get("caption") || "").slice(0, 2200);
  const location = form.get("location") ? String(form.get("location")).slice(0, 100) : null;
  const privacy = ["everyone", "followers", "onlyMe"].includes(String(form.get("privacy"))) ? String(form.get("privacy")) : "everyone";
  const allowComments = form.get("allowComments") !== "false";
  const allowDuet = form.get("allowDuet") !== "false";
  const allowDownload = form.get("allowDownload") !== "false";
  const allowSoundReuse = form.get("allowSoundReuse") !== "false";
  const allowReuse = form.get("allowReuse") !== "false";
  const soundId = form.get("soundId") ? String(form.get("soundId")) : null;
  const cover = form.get("cover") ? String(form.get("cover")) : null;
  const status = String(form.get("status")) === "draft" ? "draft" : "published";

  let duetOfId: string | undefined;
  const requestedDuetOfId = form.get("duetOfId") ? String(form.get("duetOfId")) : null;
  if (requestedDuetOfId) {
    const original = await prisma.video.findUnique({ where: { id: requestedDuetOfId } });
    if (original && original.status === "published" && original.allowDuet && original.postType === "video") {
      duetOfId = original.id;
    }
  }

  const hashtagTags = extractHashtags(caption);
  const mentionUsernames = extractMentions(caption);

  let videoUrl: string | null = null;
  let thumbnailUrl = cover || "";
  let duration: number;
  let photoUrls: string[] = [];

  if (postType === "photo") {
    const photoFiles = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (photoFiles.length === 0) return jsonError("At least one photo is required", 422);
    if (photoFiles.length > MAX_PHOTOS) return jsonError(`You can post up to ${MAX_PHOTOS} photos`, 422);
    for (const f of photoFiles) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return jsonError("Unsupported image type", 415);
      if (f.size > MAX_IMAGE_BYTES) return jsonError("Each photo must be under 15MB", 413);
    }

    const uploaded = await Promise.all(
      photoFiles.map(async (f) => {
        const buffer = Buffer.from(await f.arrayBuffer());
        const ext = f.type.split("/")[1] || "jpg";
        const { url } = await getStorage().upload(buffer, { folder: "photos", ext, contentType: f.type });
        return url;
      })
    );
    photoUrls = uploaded;
    thumbnailUrl = thumbnailUrl || uploaded[0];
    duration = Math.max(1, Math.round(Number(form.get("duration")) || photoUrls.length * 3));
  } else {
    const file = form.get("video");
    if (!(file instanceof File)) return jsonError("A video file is required", 422);
    if (file.size === 0) return jsonError("The video file is empty", 422);
    if (file.size > MAX_VIDEO_BYTES) return jsonError("Video is too large (max 200MB)", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.includes("mp4") ? "mp4" : "webm";
    const uploaded = await getStorage().upload(buffer, { folder: "videos", ext, contentType: file.type || "video/webm" });
    videoUrl = uploaded.url;
    const rawDuration = Number(form.get("duration"));
    duration = Number.isFinite(rawDuration) && rawDuration > 0 ? Math.max(1, Math.round(rawDuration)) : 15;
  }

  const video = await prisma.video.create({
    data: {
      userId: user.id,
      caption,
      postType,
      videoUrl,
      thumbnailUrl,
      duration,
      location,
      privacy,
      allowComments,
      allowDuet,
      allowDownload,
      allowSoundReuse,
      allowReuse,
      soundId: soundId || undefined,
      status,
      duetOfId,
      analytics: { create: {} },
      photos: photoUrls.length ? { create: photoUrls.map((url, order) => ({ url, order })) } : undefined,
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

  // Exposes this video's own audio as a reusable Fliq sound (unless the
  // creator already picked one from the library, or opted out). The audio
  // track plays back fine through an <audio> element even though the file
  // is the whole video container — no separate extraction step needed.
  let finalVideo = video;
  if (status === "published" && postType === "video" && !soundId && allowSoundReuse && video.videoUrl) {
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
  return jsonOk({ video: serializeVideo(finalVideo, followingIds) }, 201);
});
