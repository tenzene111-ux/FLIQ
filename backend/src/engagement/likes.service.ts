import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async like(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.status === 'removed') throw new NotFoundException('Video not found');

    try {
      await this.prisma.$transaction([
        this.prisma.like.create({ data: { userId, videoId } }),
        this.prisma.video.update({ where: { id: videoId }, data: { likeCount: { increment: 1 } } }),
      ]);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) throw new ConflictException('Already liked this video');
      throw err;
    }
    await this.notifications.notify({ userId: video.userId, actorId: userId, type: 'like', videoId });
    return { ok: true };
  }

  async unlike(userId: string, videoId: string) {
    const existing = await this.prisma.like.findUnique({ where: { userId_videoId: { userId, videoId } } });
    if (!existing) return { ok: true };

    await this.prisma.$transaction([
      this.prisma.like.delete({ where: { id: existing.id } }),
      this.prisma.video.update({ where: { id: videoId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return { ok: true };
  }

  async hasLiked(userId: string, videoId: string) {
    const existing = await this.prisma.like.findUnique({ where: { userId_videoId: { userId, videoId } } });
    return { liked: !!existing };
  }

  private isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
  }
}
