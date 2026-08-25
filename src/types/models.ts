export interface UserBrief {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isCreator: boolean;
  isPrivate: boolean;
}

export interface SoundDTO {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  isOriginal: boolean;
}

export interface VideoDTO {
  id: string;
  caption: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  aspectRatio: string;
  privacy: string;
  allowComments: boolean;
  allowDuet: boolean;
  allowDownload: boolean;
  location: string | null;
  status: string;
  createdAt: string;
  user: UserBrief;
  sound: SoundDTO | null;
  duetOf: { id: string; user: UserBrief } | null;
  hashtags: string[];
  counts: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reposts: number;
  };
  viewer: {
    isLiked: boolean;
    isSaved: boolean;
    isReposted: boolean;
    isFollowingAuthor: boolean;
  };
}

export interface CommentDTO {
  id: string;
  videoId: string;
  parentId: string | null;
  text: string;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  user: UserBrief;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
}
