import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { ListVideosQuery } from './dto/list-videos.query.js';
import { ALLOWED_CONTENT_TYPES, RequestUploadDto } from './dto/request-upload.dto.js';
import { AttachMediaDto } from './dto/attach-media.dto.js';
import { VIDEO_VIEWS_QUEUE } from './queue-names.js';

// Only the very first page at the default page size gets cached — that's
// the overwhelming majority of feed traffic (every cold app open). Deeper
// pages and non-default limits fan out into too many distinct keys to be
// worth caching and just hit Postgres directly.
const FEED_CACHE_KEY = 'feed:first:20';
const FEED_CACHE_TTL_SECONDS = 15;

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
    @InjectQueue(VIDEO_VIEWS_QUEUE) private readonly viewsQueue: Queue,
  ) {}

  private async getOwnedVideo(id: string, requesterId: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== requesterId) throw new ForbiddenException("Not this video's owner");
    return video;
  }

  private storageKey(videoId: string, kind: 'video' | 'thumbnail', extension: string): string {
    const filename = kind === 'video' ? 'source' : 'thumbnail';
    return `videos/${videoId}/${filename}.${extension}`;
  }

  // Registers the video's metadata row. It has no playable file yet — that
  // arrives once object storage + the encode worker land (next roadmap
  // steps) and flip status to "published" via markPublished.
  async create(userId: string, dto: CreateVideoDto) {
    return this.prisma.video.create({
      data: { userId, caption: dto.caption ?? '' },
    });
  }

  async findPublishedById(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    if (!video || video.status === 'removed') throw new NotFoundException('Video not found');
    return video;
  }

  async listFeed(query: ListVideosQuery) {
    const limit = query.limit ?? 20;
    const cacheable = !query.cursor && limit === 20;

    if (cacheable) {
      const cached = await this.redis.getJson<{ videos: unknown[]; nextCursor: string | null }>(FEED_CACHE_KEY);
      if (cached) return cached;
    }

    const videos = await this.prisma.video.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    const result = { videos, nextCursor: videos.length === limit ? videos.at(-1)?.id : null };

    if (cacheable) await this.redis.setJson(FEED_CACHE_KEY, result, FEED_CACHE_TTL_SECONDS);
    return result;
  }

  async listByUser(userId: string, query: ListVideosQuery) {
    const videos = await this.prisma.video.findMany({
      where: { userId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    return { videos, nextCursor: videos.length === (query.limit ?? 20) ? videos.at(-1)?.id : null };
  }

  // Manual publish endpoint — a stand-in for the real trigger (the encode
  // worker flipping status once HLS output is ready) until that step exists.
  async markPublished(id: string, requesterId: string) {
    await this.getOwnedVideo(id, requesterId);
    const video = await this.prisma.video.update({ where: { id }, data: { status: 'published' } });
    await this.redis.del(FEED_CACHE_KEY);
    return video;
  }

  async remove(id: string, requesterId: string) {
    await this.getOwnedVideo(id, requesterId);
    await this.prisma.video.update({ where: { id }, data: { status: 'removed' } });
    await this.redis.del(FEED_CACHE_KEY);
  }

  // Signs a direct-to-storage upload URL. The client PUTs the file straight
  // to R2/S3 with this URL — the raw bytes never pass through our API.
  async requestUpload(id: string, requesterId: string, dto: RequestUploadDto) {
    await this.getOwnedVideo(id, requesterId);

    const extension = ALLOWED_CONTENT_TYPES[dto.kind][dto.contentType];
    if (!extension) {
      throw new BadRequestException(`Unsupported content type "${dto.contentType}" for kind "${dto.kind}"`);
    }

    const key = this.storageKey(id, dto.kind, extension);
    const uploadUrl = await this.storage.getUploadUrl(key, dto.contentType);
    return { uploadUrl, key };
  }

  // Trusts nothing the client claims about the upload — HEADs the object in
  // storage first, so attach-media can't be used to point a video at a file
  // that was never actually uploaded.
  async attachMedia(id: string, requesterId: string, dto: AttachMediaDto) {
    await this.getOwnedVideo(id, requesterId);

    const expectedPrefix = `videos/${id}/`;
    if (!dto.key.startsWith(expectedPrefix)) {
      throw new BadRequestException("Upload key doesn't belong to this video");
    }

    const uploaded = await this.storage.exists(dto.key);
    if (!uploaded) throw new BadRequestException('Upload not found — finish uploading before attaching it');

    const publicUrl = this.storage.getPublicUrl(dto.key);
    const data =
      dto.kind === 'video'
        ? { videoUrl: publicUrl, durationMs: dto.durationMs, width: dto.width, height: dto.height }
        : { thumbnailUrl: publicUrl };

    return this.prisma.video.update({ where: { id }, data });
  }

  // Fire-and-forget: a view is queued, not written synchronously, so a
  // burst of viewers can't turn into a burst of blocking DB writes on the
  // request path. The worker (ViewsProcessor) does the actual increment.
  async queueViewIncrement(id: string) {
    await this.viewsQueue.add('increment', { videoId: id });
  }

  async incrementViewCount(id: string) {
    await this.prisma.video.updateMany({
      where: { id, status: 'published' },
      data: { viewCount: { increment: 1 } },
    });
  }
}
