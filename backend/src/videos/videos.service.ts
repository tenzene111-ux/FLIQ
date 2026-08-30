import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { ListVideosQuery } from './dto/list-videos.query.js';

@Injectable()
export class VideosService {
  constructor(private readonly prisma: PrismaService) {}

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
    const videos = await this.prisma.video.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    return { videos, nextCursor: videos.length === (query.limit ?? 20) ? videos.at(-1)?.id : null };
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
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== requesterId) throw new ForbiddenException("Can't publish another user's video");
    return this.prisma.video.update({ where: { id }, data: { status: 'published' } });
  }

  async remove(id: string, requesterId: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.userId !== requesterId) throw new ForbiddenException("Can't delete another user's video");
    await this.prisma.video.update({ where: { id }, data: { status: 'removed' } });
  }

  async incrementViewCount(id: string) {
    await this.prisma.video.updateMany({
      where: { id, status: 'published' },
      data: { viewCount: { increment: 1 } },
    });
  }
}
