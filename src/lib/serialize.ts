import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  isVerified: true,
  isCreator: true,
  isPrivate: true,
} satisfies Prisma.UserSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function serializeUserBrief(u: PublicUserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    isVerified: u.isVerified,
    isCreator: u.isCreator,
    isPrivate: u.isPrivate,
  };
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export function videoInclude(viewerId?: string | null) {
  return {
    user: { select: publicUserSelect },
    sound: true,
    hashtags: { include: { hashtag: true } },
    analytics: true,
    duetOf: { select: { id: true, user: { select: publicUserSelect } } },
    stitchOf: { select: { id: true, user: { select: publicUserSelect } } },
    photos: { orderBy: { order: "asc" } },
    _count: { select: { likes: true, comments: true, shares: true, saves: true, reposts: true } },
    likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    saves: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
    reposts: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
  } satisfies Prisma.VideoInclude;
}

export type VideoWithRelations = Prisma.VideoGetPayload<{ include: ReturnType<typeof videoInclude> }>;

export function serializeVideo(v: VideoWithRelations, followingIds?: Set<string>) {
  const base = {
    views: v.analytics?.views ?? 0,
    likes: v.analytics?.likes ?? 0,
    comments: v.analytics?.comments ?? 0,
    shares: v.analytics?.shares ?? 0,
    saves: v.analytics?.saves ?? 0,
  };
  return {
    id: v.id,
    caption: v.caption,
    postType: v.postType,
    videoUrl: v.videoUrl,
    photos: v.photos.map((p) => p.url),
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    aspectRatio: v.aspectRatio,
    privacy: v.privacy,
    allowComments: v.allowComments,
    allowDuet: v.allowDuet,
    allowStitch: v.allowStitch,
    allowDownload: v.allowDownload,
    allowSoundReuse: v.allowSoundReuse,
    allowReuse: v.allowReuse,
    isPinned: v.isPinned,
    location: v.location,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
    user: serializeUserBrief(v.user),
    duetOf: v.duetOf ? { id: v.duetOf.id, user: serializeUserBrief(v.duetOf.user) } : null,
    stitchOf: v.stitchOf ? { id: v.stitchOf.id, user: serializeUserBrief(v.stitchOf.user) } : null,
    sound: v.sound ? serializeSound(v.sound) : null,
    hashtags: v.hashtags.map((h) => h.hashtag.tag),
    counts: {
      views: base.views,
      likes: base.likes + v._count.likes,
      comments: base.comments + v._count.comments,
      shares: base.shares + v._count.shares,
      saves: base.saves + v._count.saves,
      reposts: v._count.reposts,
    },
    viewer: {
      isLiked: v.likes ? v.likes.length > 0 : false,
      isSaved: v.saves ? v.saves.length > 0 : false,
      isReposted: v.reposts ? v.reposts.length > 0 : false,
      isFollowingAuthor: followingIds ? followingIds.has(v.userId) : false,
    },
  };
}

export type VideoDTO = ReturnType<typeof serializeVideo>;

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------

export function serializeSound(s: { id: string; title: string; artist: string; coverUrl: string; audioUrl: string; duration: number; isOriginal: boolean }) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    coverUrl: s.coverUrl,
    audioUrl: s.audioUrl,
    duration: s.duration,
    isOriginal: s.isOriginal,
  };
}

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------

export function commentInclude(viewerId?: string | null) {
  return {
    user: { select: publicUserSelect },
    _count: { select: { likes: true, replies: true } },
    likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
  } satisfies Prisma.CommentInclude;
}

export type CommentWithRelations = Prisma.CommentGetPayload<{ include: ReturnType<typeof commentInclude> }>;

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export function messageInclude() {
  return {
    sender: { select: publicUserSelect },
    reactions: { include: { user: { select: publicUserSelect } } },
    replyTo: { include: { sender: { select: publicUserSelect } } },
    sharedVideo: { select: { id: true, thumbnailUrl: true, caption: true, postType: true, status: true, user: { select: publicUserSelect } } },
    sharedUser: { select: publicUserSelect },
    sharedHashtag: { select: { tag: true, viewCount: true } },
    sharedSound: { select: { id: true, title: true, artist: true, coverUrl: true, isOriginal: true } },
    sharedLive: { select: { id: true, title: true, status: true, viewerCount: true, user: { select: publicUserSelect } } },
  } satisfies Prisma.MessageInclude;
}

export type MessageWithRelations = Prisma.MessageGetPayload<{ include: ReturnType<typeof messageInclude> }>;

export function serializeMessage(m: MessageWithRelations) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    type: m.type,
    text: m.isDeleted ? null : m.text,
    mediaUrl: m.isDeleted ? null : m.mediaUrl,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt.toISOString(),
    sender: serializeUserBrief(m.sender),
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, user: serializeUserBrief(r.user) })),
    sharedVideo: m.sharedVideo
      ? {
          id: m.sharedVideo.id,
          thumbnailUrl: m.sharedVideo.thumbnailUrl,
          caption: m.sharedVideo.caption,
          postType: m.sharedVideo.postType,
          isAvailable: m.sharedVideo.status === "published",
          user: serializeUserBrief(m.sharedVideo.user),
        }
      : null,
    sharedUser: m.sharedUser ? serializeUserBrief(m.sharedUser) : null,
    sharedHashtag: m.sharedHashtag ? { tag: m.sharedHashtag.tag, viewCount: m.sharedHashtag.viewCount } : null,
    sharedSound: m.sharedSound
      ? { id: m.sharedSound.id, title: m.sharedSound.title, artist: m.sharedSound.artist, coverUrl: m.sharedSound.coverUrl, isOriginal: m.sharedSound.isOriginal }
      : null,
    sharedLive: m.sharedLive
      ? { id: m.sharedLive.id, title: m.sharedLive.title, isLive: m.sharedLive.status === "live", viewerCount: m.sharedLive.viewerCount, user: serializeUserBrief(m.sharedLive.user) }
      : null,
    replyTo: m.replyTo
      ? { id: m.replyTo.id, text: m.replyTo.isDeleted ? "Message deleted" : m.replyTo.text, sender: serializeUserBrief(m.replyTo.sender) }
      : null,
  };
}

export function serializeComment(c: CommentWithRelations) {
  return {
    id: c.id,
    videoId: c.videoId,
    parentId: c.parentId,
    text: c.isDeleted ? "[deleted]" : c.text,
    isDeleted: c.isDeleted,
    isPinned: c.isPinned,
    createdAt: c.createdAt.toISOString(),
    user: serializeUserBrief(c.user),
    likeCount: c._count.likes,
    replyCount: c._count.replies,
    isLiked: c.likes ? c.likes.length > 0 : false,
  };
}
