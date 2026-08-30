import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListVideosQuery } from '../videos/dto/list-videos.query.js';

const HASHTAG_PATTERN = /#(\w+)/g;

@Injectable()
export class HashtagsService {
  constructor(private readonly prisma: PrismaService) {}

  parseTags(caption: string): string[] {
    const matches = caption.matchAll(HASHTAG_PATTERN);
    const tags = new Set<string>();
    for (const match of matches) tags.add(match[1].toLowerCase());
    return [...tags];
  }

  // Upserts each hashtag (incrementing its use count) and links it to the
  // video. Called once, right after a video is created — captions aren't
  // editable yet, so there's no need to diff/unlink tags from a prior version.
  async linkToVideo(videoId: string, caption: string): Promise<void> {
    const tags = this.parseTags(caption);
    for (const tag of tags) {
      const hashtag = await this.prisma.hashtag.upsert({
        where: { tag },
        create: { tag, useCount: 1 },
        update: { useCount: { increment: 1 } },
      });
      await this.prisma.videoHashtag.upsert({
        where: { videoId_hashtagId: { videoId, hashtagId: hashtag.id } },
        create: { videoId, hashtagId: hashtag.id },
        update: {},
      });
    }
  }

  async search(query: string, limit = 10) {
    return this.prisma.hashtag.findMany({
      where: { tag: { contains: query.toLowerCase(), mode: 'insensitive' } },
      orderBy: { useCount: 'desc' },
      take: limit,
    });
  }

  // useCount ranking, not real trending velocity (views/likes per hour) —
  // that needs the time-windowed event data described in the spec's
  // trending section. This is the "start simple" version.
  async topTags(limit = 20) {
    return this.prisma.hashtag.findMany({ orderBy: { useCount: 'desc' }, take: limit });
  }

  async listVideosForTag(tag: string, query: ListVideosQuery) {
    const limit = query.limit ?? 20;
    const videos = await this.prisma.video.findMany({
      where: {
        status: 'published',
        hashtags: { some: { hashtag: { tag: tag.toLowerCase() } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    return { videos, nextCursor: videos.length === limit ? videos.at(-1)?.id : null };
  }
}
